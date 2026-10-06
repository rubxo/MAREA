const mockLaunchImageLibraryAsync = jest.fn();
const mockFileSystemImport = jest.fn();

jest.mock('expo-image-picker', () => ({
  launchImageLibraryAsync: (...args: unknown[]) => mockLaunchImageLibraryAsync(...args),
}));
jest.mock('expo-file-system', () => {
  mockFileSystemImport();
  return {};
});

describe('photo picker on web', () => {
  it('keeps the browser URI without loading native file APIs', async () => {
    mockLaunchImageLibraryAsync.mockResolvedValue({
      canceled: false,
      assets: [{
        uri: 'blob:http://localhost/photo',
        width: 1200,
        height: 800,
        base64: 'cGhvdG8=',
        mimeType: 'image/jpeg',
      }],
    });
    const { pickPhoto } = jest.requireActual('./pick-photo.web') as typeof import('./pick-photo.web');

    await expect(pickPhoto()).resolves.toEqual({
      uri: 'data:image/jpeg;base64,cGhvdG8=',
      width: 1200,
      height: 800,
    });
    expect(mockFileSystemImport).not.toHaveBeenCalled();
  });
});
