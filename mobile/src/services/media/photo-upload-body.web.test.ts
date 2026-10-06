const mockFileSystemImport = jest.fn();

jest.mock('expo-file-system', () => {
  mockFileSystemImport();
  return {};
});

describe('photo upload body on web', () => {
  it('reads the browser URI as a Blob without importing expo-file-system', async () => {
    const blob = new Blob(['photo'], { type: 'image/jpeg' });
    const previousFetch = globalThis.fetch;
    globalThis.fetch = jest.fn().mockResolvedValue({ ok: true, blob: async () => blob });

    try {
      const { createPhotoUploadBody } = jest.requireActual('./photo-upload-body.web') as
        typeof import('./photo-upload-body.web');

      await expect(createPhotoUploadBody('blob:http://localhost/photo')).resolves.toBe(blob);
      expect(globalThis.fetch).toHaveBeenCalledWith('blob:http://localhost/photo');
      expect(mockFileSystemImport).not.toHaveBeenCalled();
    } finally {
      globalThis.fetch = previousFetch;
    }
  });
});
