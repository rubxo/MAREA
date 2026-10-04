import { CryptoDigestAlgorithm, digestStringAsync } from 'expo-crypto';
import { Directory, File, Paths } from 'expo-file-system';

import { LocalDatabase, openLocalDatabase } from '@/data/local/database';

import { CachedImageFile, ImageDiskStore } from './image-cache-manager';

type ImageCacheRow = {
  url: string;
  local_uri: string;
  size: number;
  last_access: number;
};

export class ExpoImageFileStore implements ImageDiskStore {
  private readonly directory = new Directory(Paths.cache, 'marea-images');
  private pruneQueue: Promise<void> = Promise.resolve();

  constructor(private readonly database: Promise<LocalDatabase> = openLocalDatabase()) {}

  private ensureDirectory(): void {
    this.directory.create({ intermediates: true, idempotent: true });
  }

  private async filename(url: string): Promise<string> {
    return `${await digestStringAsync(CryptoDigestAlgorithm.SHA256, url)}.image`;
  }

  private safeDelete(file: File): void {
    if (file.exists) file.delete();
  }

  async recover(): Promise<void> {
    this.ensureDirectory();
    const database = await this.database;
    const rows = await database.getAllAsync<ImageCacheRow>(
      `SELECT remote_url AS url, local_uri, byte_size AS size,
              last_accessed_at AS last_access
       FROM image_cache`,
    );
    const knownUris = new Set(rows.map((row) => row.local_uri));

    for (const entry of this.directory.list()) {
      if (entry instanceof File && (entry.name.includes('.tmp') || !knownUris.has(entry.uri))) {
        this.safeDelete(entry);
      }
    }

    for (const row of rows) {
      if (!new File(row.local_uri).exists) {
        await database.runAsync('DELETE FROM image_cache WHERE remote_url = ?', row.url);
      }
    }
  }

  async find(url: string): Promise<CachedImageFile | null> {
    const database = await this.database;
    const row = await database.getFirstAsync<ImageCacheRow>(
      `SELECT remote_url AS url, local_uri, byte_size AS size,
              last_accessed_at AS last_access
       FROM image_cache WHERE remote_url = ?`,
      url,
    );
    if (!row) return null;

    const cached = new File(row.local_uri);
    if (!cached.exists) {
      await database.runAsync('DELETE FROM image_cache WHERE remote_url = ?', url);
      return null;
    }

    return { url: row.url, uri: row.local_uri, size: row.size, lastAccess: row.last_access };
  }

  async download(url: string, signal: AbortSignal): Promise<CachedImageFile> {
    this.ensureDirectory();
    const name = await this.filename(url);
    const temporary = new File(this.directory, `${name}.tmp`);
    const destination = new File(this.directory, name);
    this.safeDelete(temporary);

    try {
      await File.downloadFileAsync(url, temporary, { idempotent: true, signal });
      if (signal.aborted) throw Object.assign(new Error('Download aborted'), { name: 'AbortError' });
      await temporary.move(destination, { overwrite: true });

      const timestamp = Date.now();
      const size = Math.max(1, destination.size);
      const database = await this.database;
      await database.runAsync(
        `INSERT INTO image_cache
           (cache_key, remote_url, local_uri, byte_size, last_accessed_at)
         VALUES (?, ?, ?, ?, ?)
         ON CONFLICT(remote_url) DO UPDATE SET
           local_uri = excluded.local_uri,
           byte_size = excluded.byte_size,
           last_accessed_at = excluded.last_accessed_at`,
        name,
        url,
        destination.uri,
        size,
        timestamp,
      );
      return { url, uri: destination.uri, size, lastAccess: timestamp };
    } catch (error) {
      this.safeDelete(temporary);
      throw error;
    }
  }

  async touch(url: string, timestamp: number): Promise<void> {
    const database = await this.database;
    await database.runAsync(
      'UPDATE image_cache SET last_accessed_at = ? WHERE remote_url = ?',
      timestamp,
      url,
    );
  }

  prune(maxBytes: number, protectedUris: ReadonlySet<string>): Promise<void> {
    this.pruneQueue = this.pruneQueue.then(() => this.performPrune(maxBytes, protectedUris));
    return this.pruneQueue;
  }

  private async performPrune(maxBytes: number, protectedUris: ReadonlySet<string>): Promise<void> {
    const database = await this.database;
    const rows = await database.getAllAsync<ImageCacheRow>(
      `SELECT remote_url AS url, local_uri, byte_size AS size,
              last_accessed_at AS last_access
       FROM image_cache ORDER BY last_accessed_at ASC`,
    );
    let total = rows.reduce((sum, row) => sum + row.size, 0);

    for (const row of rows) {
      if (total <= maxBytes) break;
      if (protectedUris.has(row.local_uri)) continue;
      this.safeDelete(new File(row.local_uri));
      await database.runAsync('DELETE FROM image_cache WHERE remote_url = ?', row.url);
      total -= row.size;
    }
  }
}
