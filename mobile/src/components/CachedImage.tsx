import { Image, ImageProps } from 'expo-image';
import { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { getImageCacheManager } from '@/services/image-cache/image-cache';
import { ImageLease } from '@/services/image-cache/image-cache-manager';
import { colors } from '@/theme/tokens';

type CachedImageProps = Omit<ImageProps, 'source' | 'cachePolicy'> &
  Readonly<{
    uri: string;
  }>;

export function CachedImage({ uri, style, ...props }: CachedImageProps) {
  const [localUri, setLocalUri] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    let lease: ImageLease | undefined;
    setTimeout(() => {
      if (!controller.signal.aborted) {
        setLocalUri(null);
        setFailed(false);
      }
    }, 0);

    void getImageCacheManager()
      .acquire(uri, controller.signal)
      .then((resolvedLease) => {
        if (controller.signal.aborted) {
          resolvedLease.release();
          return;
        }
        lease = resolvedLease;
        setLocalUri(resolvedLease.uri);
      })
      .catch((error: unknown) => {
        if (error instanceof Error && error.name === 'AbortError') return;
        if (!controller.signal.aborted) setFailed(true);
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
