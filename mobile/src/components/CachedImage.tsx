import { Image, ImageProps } from 'expo-image';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { getImageCacheManager } from '@/services/image-cache/image-cache';
import { ImageLease } from '@/services/image-cache/image-cache-manager';
import { colors } from '@/theme/tokens';

type CachedImageProps = Omit<ImageProps, 'source' | 'cachePolicy'> &
  Readonly<{
    uri: string;
  }>;

export function CachedImage({ uri, style, onError, ...props }: CachedImageProps) {
  const [result, setResult] = useState<{ source: string; localUri: string | null; failed: boolean } | null>(null);
  const isLocal = uri.startsWith('file:') || uri.startsWith('content:');
  const localUri = isLocal ? uri : result?.source === uri ? result.localUri : null;
  const failed = result?.source === uri && result.failed;
  const onErrorRef = useRef(onError);
  useEffect(() => { onErrorRef.current = onError; }, [onError]);

  useEffect(() => {
    const controller = new AbortController();
    let lease: ImageLease | undefined;
    if (uri.startsWith('file:') || uri.startsWith('content:')) {
      return () => controller.abort();
    }
    void getImageCacheManager()
      .acquire(uri, controller.signal)
      .then((resolvedLease) => {
        if (controller.signal.aborted) {
          resolvedLease.release();
          return;
        }
        lease = resolvedLease;
        setResult({ source: uri, localUri: resolvedLease.uri, failed: false });
      })
      .catch((error: unknown) => {
        if (error instanceof Error && error.name === 'AbortError') return;
        if (!controller.signal.aborted) { setResult({ source: uri, localUri: null, failed: true }); onErrorRef.current?.({ error: error instanceof Error ? error.message : 'No se pudo cargar la imagen' }); }
      });

    return () => {
      controller.abort();
      lease?.release();
    };
  }, [uri]);

  if (!localUri || failed) {
    return (
      <View style={[style, styles.placeholder]}>
        {!failed ? <ActivityIndicator color={colors.coral} size="small" /> : null}
      </View>
    );
  }

  return (
    <Image
      {...props}
      onError={onError}
      source={{ uri: localUri }}
      style={style}
      cachePolicy="none"
      recyclingKey={uri}
    />
  );
}

const styles = StyleSheet.create({
  placeholder: { alignItems: 'center', backgroundColor: colors.hairline, justifyContent: 'center' },
});
