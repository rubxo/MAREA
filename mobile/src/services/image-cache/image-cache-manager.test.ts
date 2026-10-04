import {
  CachedImageFile,
  ImageCacheManager,
  ImageDiskStore,
} from './image-cache-manager';

function file(url: string, suffix = 'jpg'): CachedImageFile {
  return { url, uri: `file:///cache/${suffix}`, size: 1024, lastAccess: 1 };
}

function createStore(overrides: Partial<ImageDiskStore> = {}): jest.Mocked<ImageDiskStore> {
  return {
    recover: jest.fn().mockResolvedValue(undefined),
    find: jest.fn().mockResolvedValue(null),
    download: jest.fn().mockImplementation(async (url) => file(url)),
    touch: jest.fn().mockResolvedValue(undefined),
    prune: jest.fn().mockResolvedValue(undefined),
    ...overrides,
  } as jest.Mocked<ImageDiskStore>;
}

async function waitFor(check: () => boolean): Promise<void> {
  for (let attempt = 0; attempt < 20; attempt += 1) {
    if (check()) return;
    await Promise.resolve();
  }
  throw new Error('Condition was not reached');
}

describe('ImageCacheManager', () => {
  it('resolves RAM, disk and network in that order', async () => {
    const diskHit = file('https://marea.test/disk.jpg', 'disk.jpg');
    const store = createStore({ find: jest.fn().mockResolvedValueOnce(diskHit).mockResolvedValue(null) });
    const manager = new ImageCacheManager(store, { memoryBytes: 4096, diskBytes: 8192 });

    const first = await manager.acquire(diskHit.url);
    first.release();
    const memory = await manager.acquire(diskHit.url);
    memory.release();
    const network = await manager.acquire('https://marea.test/network.jpg');
    network.release();

    expect(store.find).toHaveBeenCalledTimes(2);
    expect(store.download).toHaveBeenCalledTimes(1);
    expect(network.uri).toContain('file:///cache/');
  });

  it('deduplicates simultaneous requests for the same URL', async () => {
    let finish: ((value: CachedImageFile) => void) | undefined;
    const store = createStore({
      download: jest.fn().mockImplementation(
        (url) => new Promise<CachedImageFile>((resolve) => {
          finish = () => resolve(file(url));
        }),
      ),
    });
    const manager = new ImageCacheManager(store);

    const one = manager.acquire('https://marea.test/shared.jpg');
    const two = manager.acquire('https://marea.test/shared.jpg');
    await waitFor(() => Boolean(finish));
    finish?.(file('https://marea.test/shared.jpg'));

    const [leaseOne, leaseTwo] = await Promise.all([one, two]);
    expect(store.download).toHaveBeenCalledTimes(1);
    leaseOne.release();
    leaseTwo.release();
  });

  it('cancels an in-flight download when every consumer leaves', async () => {
    const store = createStore({
      download: jest.fn().mockImplementation(
        (_url, signal) =>
          new Promise<CachedImageFile>((_resolve, reject) => {
            signal.addEventListener('abort', () => reject(new Error('aborted')), { once: true });
          }),
      ),
    });
    const manager = new ImageCacheManager(store);
    const consumer = new AbortController();

    const pending = manager.acquire('https://marea.test/slow.jpg', consumer.signal);
    await waitFor(() => store.download.mock.calls.length === 1);
    consumer.abort();

    await expect(pending).rejects.toMatchObject({ name: 'AbortError' });
    expect(store.download.mock.calls[0]?.[1].aborted).toBe(true);
  });

  it('recovers temporary and orphaned files once before serving images', async () => {
    const store = createStore();
    const manager = new ImageCacheManager(store);

    await Promise.all([
      manager.acquire('https://marea.test/a.jpg'),
      manager.acquire('https://marea.test/b.jpg'),
    ]).then((leases) => leases.forEach((lease) => lease.release()));

    expect(store.recover).toHaveBeenCalledTimes(1);
  });
});
