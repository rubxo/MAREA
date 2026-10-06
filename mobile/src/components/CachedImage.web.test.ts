const mockNativeImageCache = jest.fn();

jest.mock('@/services/image-cache/image-cache', () => {
  mockNativeImageCache();
  return {};
});

jest.mock('expo-image', () => ({ Image: 'ExpoImage' }));

describe('CachedImage web entry', () => {
  it('uses Expo Image browser caching without loading the native file store', () => {
    jest.isolateModules(() => {
      const { CachedImage } = jest.requireActual('./CachedImage.web') as typeof import('./CachedImage.web');
      const element = CachedImage({ uri: 'https://images.example/post.jpg' });

      expect(element.props).toMatchObject({
        source: { uri: 'https://images.example/post.jpg' },
        cachePolicy: 'memory-disk',
        recyclingKey: 'https://images.example/post.jpg',
      });
    });

    expect(mockNativeImageCache).not.toHaveBeenCalled();
  });
});
