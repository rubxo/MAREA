import { Image, ImageProps } from 'expo-image';

type CachedImageProps = Omit<ImageProps, 'source' | 'cachePolicy'> & Readonly<{ uri: string }>;

export function CachedImage({ uri, ...props }: CachedImageProps) {
  return <Image {...props} source={{ uri }} cachePolicy="memory-disk" recyclingKey={uri} />;
}
