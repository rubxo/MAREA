import { ExpoImageFileStore } from './expo-file-store';
import { ImageCacheManager } from './image-cache-manager';

let singleton: ImageCacheManager | undefined;

export function getImageCacheManager(): ImageCacheManager {
  singleton ??= new ImageCacheManager(new ExpoImageFileStore());
  return singleton;
}

