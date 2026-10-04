import { LruIndex } from './lru-index';

export type CachedImageFile = Readonly<{
  url: string;
  uri: string;
  size: number;
  lastAccess: number;
}>;

export interface ImageDiskStore {
  recover(): Promise<void>;
  find(url: string): Promise<CachedImageFile | null>;
  download(url: string, signal: AbortSignal): Promise<CachedImageFile>;
  touch(url: string, timestamp: number): Promise<void>;
  prune(maxBytes: number, protectedUris: ReadonlySet<string>): Promise<void>;
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

    let request = this.inFlight.get(url);
    if (!request) {
      const controller = new AbortController();
      const promise = this.load(url, controller.signal).finally(() => {
        const current = this.inFlight.get(url);
        if (current?.promise === promise) this.inFlight.delete(url);
      });
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
      void this.store.touch(url, Date.now());
      return memoryHit;
    }

    const diskHit = await this.store.find(url);
    if (signal.aborted) throw abortError();
    if (diskHit) {
      this.memory.set(url, diskHit, Math.max(1, diskHit.size));
      void this.store.touch(url, Date.now());
      return diskHit;
    }

    const downloaded = await this.store.download(url, signal);
    this.memory.set(url, downloaded, Math.max(1, downloaded.size));
    return downloaded;
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
          resolve(this.createLease(url, cachedFile));
        },
        (error: unknown) => {
          if (settled) return;
          settled = true;
          signal?.removeEventListener('abort', onAbort);
          request.consumers = Math.max(0, request.consumers - 1);
          reject(error);
        },
      );
    });
  }

  private createLease(url: string, cachedFile: CachedImageFile): ImageLease {
    const current = this.activeLeases.get(url);
    this.activeLeases.set(url, { count: (current?.count ?? 0) + 1, uri: cachedFile.uri });
    void this.store.prune(this.options.diskBytes, this.protectedUris());

    let released = false;
    return {
      uri: cachedFile.uri,
      release: () => {
        if (released) return;
        released = true;
        const active = this.activeLeases.get(url);
        if (!active || active.count <= 1) this.activeLeases.delete(url);
        else this.activeLeases.set(url, { ...active, count: active.count - 1 });
        void this.store.prune(this.options.diskBytes, this.protectedUris());
      },
    };
  }

  private protectedUris(): ReadonlySet<string> {
    return new Set([...this.activeLeases.values()].map((active) => active.uri));
  }
}
