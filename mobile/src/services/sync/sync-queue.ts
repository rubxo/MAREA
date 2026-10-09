import type { LocalDatabase } from '@/data/local/database';
import type { SyncOperation, SyncOperationType } from '@/domain/models/sync';
import { Platform } from 'react-native';

export type NewSyncOperation = Readonly<{
  id: string;
  type: SyncOperationType;
  payload: Readonly<Record<string, unknown>>;
}>;

export interface SyncOperationStore {
  insert(operation: SyncOperation): Promise<void>;
  leaseNext(now: string, leaseExpiresAt: string): Promise<SyncOperation | null>;
  remove(id: string): Promise<void>;
  markFailed(id: string, nextAttemptAt: string, error: string): Promise<void>;
}

export interface BrowserStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

const BASE_BACKOFF_MS = 1_000;
const MAX_BACKOFF_MS = 5 * 60_000;

export function computeBackoffMs(attempts: number): number {
  return Math.min(MAX_BACKOFF_MS, BASE_BACKOFF_MS * 2 ** Math.max(0, attempts - 1));
}

export class SyncQueue {
  private readonly leasedAttempts = new Map<string, number>();

  constructor(
    private readonly store: SyncOperationStore,
    private readonly now: () => Date = () => new Date(),
    private readonly leaseDurationMs = 30_000,
  ) {}

  async enqueue(input: NewSyncOperation): Promise<void> {
    const timestamp = this.now().toISOString();
    await this.store.insert({
      ...input,
      state: 'pending',
      attempts: 0,
      createdAt: timestamp,
      nextAttemptAt: timestamp,
      leaseExpiresAt: null,
      lastError: null,
    });
  }

  async leaseNext(): Promise<SyncOperation | null> {
    const now = this.now();
    const operation = await this.store.leaseNext(
      now.toISOString(),
      new Date(now.getTime() + this.leaseDurationMs).toISOString(),
    );
    if (operation) this.leasedAttempts.set(operation.id, operation.attempts);
    return operation;
  }

  complete(id: string): Promise<void> {
    this.leasedAttempts.delete(id);
    return this.store.remove(id);
  }

  async fail(id: string, error: unknown): Promise<void> {
    const attempts = this.leasedAttempts.get(id) ?? 1;
    this.leasedAttempts.delete(id);
    const permanent = typeof error === 'object' && error !== null && 'permanent' in error && error.permanent === true;
    const nextAttemptAt = permanent ? '9999-12-31T00:00:00.000Z' : new Date(this.now().getTime() + computeBackoffMs(attempts)).toISOString();
    const message = error instanceof Error ? error.message : String(error);
    await this.store.markFailed(id, nextAttemptAt, message.slice(0, 500));
  }
}

type SyncOperationRow = {
  id: string;
  type: SyncOperationType;
  payload: string;
  state: SyncOperation['state'];
  attempts: number;
  created_at: string;
  next_attempt_at: string;
  lease_expires_at: string | null;
  last_error: string | null;
};

function mapRow(row: SyncOperationRow): SyncOperation {
  return {
    id: row.id,
    type: row.type,
    payload: JSON.parse(row.payload) as Record<string, unknown>,
    state: row.state,
    attempts: row.attempts,
    createdAt: row.created_at,
    nextAttemptAt: row.next_attempt_at,
    leaseExpiresAt: row.lease_expires_at,
    lastError: row.last_error,
  };
}

export class SqliteSyncOperationStore implements SyncOperationStore {
  constructor(private readonly database: LocalDatabase) {}

  async insert(operation: SyncOperation): Promise<void> {
    await this.database.runAsync(
      `INSERT INTO sync_operations
        (id, type, payload, state, attempts, created_at, next_attempt_at, lease_expires_at, last_error)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(id) DO NOTHING`,
      operation.id, operation.type, JSON.stringify(operation.payload), operation.state,
      operation.attempts, operation.createdAt, operation.nextAttemptAt,
      operation.leaseExpiresAt, operation.lastError,
    );
  }

  async leaseNext(now: string, leaseExpiresAt: string): Promise<SyncOperation | null> {
    if (Platform.OS === 'web') {
      await this.database.runAsync(
        `UPDATE sync_operations SET state = 'pending', lease_expires_at = NULL
         WHERE state = 'processing' AND lease_expires_at <= ?`,
        now,
      );
      const row = await this.database.getFirstAsync<SyncOperationRow>(
        `SELECT * FROM sync_operations
         WHERE next_attempt_at NOT LIKE '9999%'
         ORDER BY rowid ASC LIMIT 1`,
      );
      if (!row || row.state === 'processing' || row.next_attempt_at > now) return null;
      await this.database.runAsync(
        `UPDATE sync_operations
         SET state = 'processing', attempts = attempts + 1, lease_expires_at = ?, last_error = NULL
         WHERE id = ?`,
        leaseExpiresAt,
        row.id,
      );
      return mapRow({ ...row, state: 'processing', attempts: row.attempts + 1, lease_expires_at: leaseExpiresAt });
    }
    let leased: SyncOperation | null = null;
    await this.database.withExclusiveTransactionAsync(async (transaction) => {
      await transaction.runAsync(
        `UPDATE sync_operations SET state = 'pending', lease_expires_at = NULL
         WHERE state = 'processing' AND lease_expires_at <= ?`,
        now,
      );
      const row = await transaction.getFirstAsync<SyncOperationRow>(
        `SELECT * FROM sync_operations
         WHERE next_attempt_at NOT LIKE '9999%'
         ORDER BY rowid ASC LIMIT 1`,
      );
      if (!row || row.state === 'processing' || row.next_attempt_at > now) return;
      await transaction.runAsync(
        `UPDATE sync_operations
         SET state = 'processing', attempts = attempts + 1, lease_expires_at = ?, last_error = NULL
         WHERE id = ?`,
        leaseExpiresAt, row.id,
      );
      leased = mapRow({ ...row, state: 'processing', attempts: row.attempts + 1, lease_expires_at: leaseExpiresAt });
    });
    return leased;
  }

  async remove(id: string): Promise<void> {
    await this.database.runAsync('DELETE FROM sync_operations WHERE id = ?', id);
  }

  async markFailed(id: string, nextAttemptAt: string, error: string): Promise<void> {
    await this.database.runAsync(
      `UPDATE sync_operations
       SET state = 'failed', next_attempt_at = ?, lease_expires_at = NULL, last_error = ?
       WHERE id = ?`,
      nextAttemptAt, error, id,
    );
  }
}

export class MemorySyncOperationStore implements SyncOperationStore {
  private readonly operations = new Map<string, SyncOperation>();

  async insert(operation: SyncOperation): Promise<void> {
    if (!this.operations.has(operation.id)) this.operations.set(operation.id, operation);
  }

  async leaseNext(now: string, leaseExpiresAt: string): Promise<SyncOperation | null> {
    for (const [id, operation] of this.operations) {
      const leaseExpired = operation.state === 'processing' && operation.leaseExpiresAt !== null
        && operation.leaseExpiresAt <= now;
      if (operation.nextAttemptAt.startsWith('9999')) continue;
      if ((operation.state === 'processing' && !leaseExpired) || operation.nextAttemptAt > now) return null;
      const leased = { ...operation, state: 'processing' as const, attempts: operation.attempts + 1, leaseExpiresAt };
      this.operations.set(id, leased);
      return leased;
    }
    return null;
  }

  async remove(id: string): Promise<void> { this.operations.delete(id); }

  async markFailed(id: string, nextAttemptAt: string, error: string): Promise<void> {
    const operation = this.operations.get(id);
    if (operation) this.operations.set(id, { ...operation, state: 'failed', nextAttemptAt, leaseExpiresAt: null, lastError: error });
  }

  values(): SyncOperation[] { return [...this.operations.values()]; }

  retryFailed(now: string): void {
    for (const [id, operation] of this.operations) {
      if (operation.state === 'failed') this.operations.set(id, {
        ...operation, state: 'pending', nextAttemptAt: now, leaseExpiresAt: null, lastError: null,
      });
    }
  }
}

export class LocalStorageSyncOperationStore implements SyncOperationStore {
  constructor(private readonly storage: BrowserStorage, private readonly key: string) {}

  private read(): SyncOperation[] {
    try {
      const value = this.storage.getItem(this.key);
      if (!value) return [];
      const parsed: unknown = JSON.parse(value);
      return Array.isArray(parsed) ? parsed as SyncOperation[] : [];
    } catch {
      this.storage.removeItem(this.key);
      return [];
    }
  }

  private write(operations: readonly SyncOperation[]): void {
    this.storage.setItem(this.key, JSON.stringify(operations));
  }

  async insert(operation: SyncOperation): Promise<void> {
    const operations = this.read();
    if (!operations.some((current) => current.id === operation.id)) this.write([...operations, operation]);
  }

  async leaseNext(now: string, leaseExpiresAt: string): Promise<SyncOperation | null> {
    const operations = this.read().map((operation) =>
      operation.state === 'processing' && operation.leaseExpiresAt !== null && operation.leaseExpiresAt <= now
        ? { ...operation, state: 'pending' as const, leaseExpiresAt: null }
        : operation);
    const index = operations.findIndex((operation) =>
      !operation.nextAttemptAt.startsWith('9999')
      && operation.state !== 'processing'
      && operation.nextAttemptAt <= now);
    if (index === -1) {
      this.write(operations);
      return null;
    }
    const leased: SyncOperation = {
      ...operations[index], state: 'processing', attempts: operations[index].attempts + 1,
      leaseExpiresAt, lastError: null,
    };
    operations[index] = leased;
    this.write(operations);
    return leased;
  }

  async remove(id: string): Promise<void> {
    this.write(this.read().filter((operation) => operation.id !== id));
  }

  async markFailed(id: string, nextAttemptAt: string, error: string): Promise<void> {
    this.write(this.read().map((operation) => operation.id === id ? {
      ...operation, state: 'failed', nextAttemptAt, leaseExpiresAt: null, lastError: error,
    } : operation));
  }

  values(): SyncOperation[] { return this.read(); }

  retryFailed(now: string): void {
    this.write(this.read().map((operation) => operation.state === 'failed' ? {
      ...operation, state: 'pending', nextAttemptAt: now, leaseExpiresAt: null, lastError: null,
    } : operation));
  }
}
