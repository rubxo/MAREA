import { LruIndex } from './lru-index';

export type CachedImageFile = Readonly<{
  url: string;
  uri: string;
  size: number;
  lastAccess: number;
  memoryUri?: string;
}>;

export interface ImageDiskStore {
  recover(): Promise<void>;
  readMemory(file: CachedImageFile): Promise<string>;
  find(url: string): Promise<CachedImageFile | null>;
  download(url: string, signal: AbortSignal): Promise<CachedImageFile>;
  touch(url: string, timestamp: number): Promise<void>;
  prune(maxBytes: number, isProtected: (file: CachedImageFile) => boolean): Promise<void>;
}

export type ImageLease = Readonly<{
  uri: string;
  release(): void;
}>;

type InFlight = {
  controller: AbortController;
  consumers: number;
  promise: Promise<CachedImageFile>;
};

type ImageCacheOptions = Readonly<{
  memoryBytes: number;
  diskBytes: number;
}>;

const DEFAULT_OPTIONS: ImageCacheOptions = {
  memoryBytes: 24 * 1024 * 1024,
  diskBytes: 256 * 1024 * 1024,
};

function abortError(): Error {
  const error = new Error('Image request was cancelled');
  error.name = 'AbortError';
  return error;
}

function validateUrl(url: string): void {
  const parsed = new URL(url);
  if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') {
    throw new Error('Only HTTP(S) image URLs can be cached');
  }
}

export class ImageCacheManager {
  private readonly memory: LruIndex<string, CachedImageFile>;
  private readonly inFlight = new Map<string, InFlight>();
  private readonly activeLeases = new Map<string, { count: number; uri: string }>();
  private readonly initialization: Promise<void>;
  private readonly options: ImageCacheOptions;
  private memoryQueue: Promise<unknown> = Promise.resolve();

  constructor(
    private readonly store: ImageDiskStore,
    options: Partial<ImageCacheOptions> = {},
  ) {
    this.options = { ...DEFAULT_OPTIONS, ...options };
    this.memory = new LruIndex(this.options.memoryBytes);
    this.initialization = this.store.recover();
  }

  acquire(url: string, signal?: AbortSignal): Promise<ImageLease> {
    validateUrl(url);
    if (signal?.aborted) return Promise.reject(abortError());

    let request = this.inFlight.get(url);
    if (!request) {
      const controller = new AbortController();
      const promise = this.load(url, controller.signal);
      request = { controller, consumers: 0, promise };
      this.inFlight.set(url, request);
    }

    request.consumers += 1;
    return this.waitForConsumer(url, request, signal);
  }

  private async load(url: string, signal: AbortSignal): Promise<CachedImageFile> {
    await this.initialization;
    if (signal.aborted) throw abortError();

    const memoryHit = this.memory.get(url);
    if (memoryHit) {
      void this.store.touch(url, Date.now()).catch(() => {});
      return memoryHit;
    }

    const diskHit = await this.store.find(url);
    if (signal.aborted) throw abortError();
    if (diskHit) {
      const resident = await this.toMemory(diskHit, signal);
      void this.store.touch(url, Date.now()).catch(() => {});
      return resident;
    }

    const downloaded = await this.store.download(url, signal);
    return this.toMemory(downloaded, signal);
  }

  private toMemory(file: CachedImageFile, signal: AbortSignal): Promise<CachedImageFile> {
    // Limit temporary encoding allocations to one image while downloads remain concurrent.
    const promotion = this.memoryQueue.catch(() => {}).then(() => this.promote(file, signal));
    this.memoryQueue = promotion.then(() => undefined, () => undefined);
    return promotion;
  }

  private async promote(file: CachedImageFile, signal: AbortSignal): Promise<CachedImageFile> {
    if (signal.aborted) throw abortError();
    // Base64 strings consume up to two bytes per character in JS. Oversized images stay on disk.
    if (file.size * 8 / 3 > this.options.memoryBytes) return file;
    const memoryUri = await this.store.readMemory(file);
    if (signal.aborted) throw abortError();
    const resident = { ...file, memoryUri };
    this.memory.set(file.url, resident, Math.max(1, memoryUri.length * 2));
    return resident;
  }

  private waitForConsumer(
    url: string,
    request: InFlight,
    signal?: AbortSignal,
  ): Promise<ImageLease> {
    return new Promise((resolve, reject) => {
      let settled = false;

      const leavePending = () => {
        request.consumers = Math.max(0, request.consumers - 1);
        if (request.consumers === 0 && this.inFlight.get(url) === request) {
          this.inFlight.delete(url);
          request.controller.abort();
        }
      };

      const onAbort = () => {
        if (settled) return;
        settled = true;
        leavePending();
        reject(abortError());
      };

      if (signal?.aborted) {
        onAbort();
        return;
      }
      signal?.addEventListener('abort', onAbort, { once: true });

      request.promise.then(
        (cachedFile) => {
          if (settled) return;
          settled = true;
          signal?.removeEventListener('abort', onAbort);
          request.consumers = Math.max(0, request.consumers - 1);
          const lease = this.createLease(url, cachedFile);
          if (request.consumers === 0 && this.inFlight.get(url) === request) this.inFlight.delete(url);
          resolve(lease);
        },
        (error: unknown) => {
          if (settled) return;
          settled = true;
          signal?.removeEventListener('abort', onAbort);
          request.consumers = Math.max(0, request.consumers - 1);
          if (request.consumers === 0 && this.inFlight.get(url) === request) this.inFlight.delete(url);
          reject(error);
        },
      );
    });
  }

  private createLease(url: string, cachedFile: CachedImageFile): ImageLease {
    const current = this.activeLeases.get(url);
    this.activeLeases.set(url, { count: (current?.count ?? 0) + 1, uri: cachedFile.uri });
    void this.store.prune(this.options.diskBytes, this.isProtected).catch(() => {});

    let released = false;
    return {
      uri: cachedFile.memoryUri ?? cachedFile.uri,
      release: () => {
        if (released) return;
        released = true;
        const active = this.activeLeases.get(url);
        if (!active || active.count <= 1) this.activeLeases.delete(url);
        else this.activeLeases.set(url, { ...active, count: active.count - 1 });
        void this.store.prune(this.options.diskBytes, this.isProtected).catch(() => {});
      },
    };
  }

  private readonly isProtected = (file: CachedImageFile): boolean =>
    this.inFlight.has(file.url) || [...this.activeLeases.values()].some((active) => active.uri === file.uri);
}
