import { randomUUID } from 'expo-crypto';
import { openDatabaseAsync, SQLiteDatabase } from 'expo-sqlite';
import { Platform } from 'react-native';
import { getSupabaseClient } from '@/data/remote/supabase-client';
import { INITIAL_SCHEMA_SQL } from '@/data/local/schema';
import type { SyncOperationType, SyncOperation } from '@/domain/models/sync';
import { uploadPhoto } from '@/services/media/upload-photo';
import { SyncQueue, SqliteSyncOperationStore } from './sync-queue';
import { SyncManager } from './sync-manager';

export type RuntimeSnapshot = { pending: number; failed: number; revision: number; error: string | null };
const runtimes = new Map<string, Promise<SocialRuntime>>();
export function getSocialRuntime(userId: string): Promise<SocialRuntime> {
  if (!/^[a-zA-Z0-9-]+$/.test(userId)) throw new Error('Identificador inválido.');
  let pending = runtimes.get(userId);
  if (!pending) {
    pending = SocialRuntime.open(userId);
    runtimes.set(userId, pending);
    void pending.catch(() => runtimes.delete(userId));
  }
  return pending;
}

export class SocialRuntime {
  readonly queue: SyncQueue;
  private readonly manager: SyncManager;
  private listeners = new Set<() => void>();
  snapshot: RuntimeSnapshot = { pending: 0, failed: 0, revision: 0, error: null };
  private constructor(readonly userId: string, private readonly db: SQLiteDatabase) {
    this.queue = new SyncQueue(new SqliteSyncOperationStore(db));
    this.manager = new SyncManager(this.queue, { execute: (operation) => this.execute(operation) });
  }
  static async open(userId: string): Promise<SocialRuntime> {
    const db = await openDatabaseAsync(Platform.OS === 'web' ? ':memory:' : 'marea-user-' + userId + '.db');
    await db.execAsync('PRAGMA journal_mode=WAL; PRAGMA foreign_keys=ON;');
    await db.execAsync(INITIAL_SCHEMA_SQL);
    await db.execAsync('CREATE TABLE IF NOT EXISTS snapshots (key TEXT PRIMARY KEY, value TEXT NOT NULL, updated_at TEXT NOT NULL)');
    const runtime = new SocialRuntime(userId, db);
    await runtime.refresh();
    return runtime;
  }
  subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };
  private async refresh(): Promise<void> {
    const counts = await this.db.getFirstAsync<{ pending: number; failed: number }>(
      "SELECT count(*) as pending, coalesce(sum(CASE WHEN next_attempt_at LIKE '9999%' THEN 1 ELSE 0 END),0) as failed FROM sync_operations");
    this.snapshot = { ...this.snapshot, pending: counts?.pending ?? 0, failed: counts?.failed ?? 0, revision: this.snapshot.revision + 1 };
    this.listeners.forEach((listener) => listener());
  }
  async readCache<T>(key: string): Promise<T | null> {
    const row = await this.db.getFirstAsync<{ value: string }>('SELECT value FROM snapshots WHERE key=?', key);
    return row ? JSON.parse(row.value) as T : null;
  }
  async writeCache(key: string, value: unknown): Promise<void> {
    await this.db.runAsync('INSERT INTO snapshots(key,value,updated_at) VALUES(?,?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value,updated_at=excluded.updated_at',
      key, JSON.stringify(value), new Date().toISOString());
    // Bounded structured cache; the operation log is never evicted.
    await this.db.runAsync('DELETE FROM snapshots WHERE key IN (SELECT key FROM snapshots ORDER BY updated_at DESC LIMIT -1 OFFSET 250)');
  }
  async enqueue(type: SyncOperationType, payload: Readonly<Record<string, unknown>>, id = randomUUID()): Promise<string> {
    await this.queue.enqueue({ id, type, payload });
    await this.refresh();
    return id;
  }
  async pendingOperations(): Promise<SyncOperation[]> {
    const rows = await this.db.getAllAsync<{id:string;type:SyncOperationType;payload:string;state:SyncOperation['state'];attempts:number;created_at:string;next_attempt_at:string;lease_expires_at:string|null;last_error:string|null}>('SELECT * FROM sync_operations ORDER BY rowid');
    return rows.map(row => ({id:row.id,type:row.type,payload:JSON.parse(row.payload) as Record<string,unknown>,state:row.state,attempts:row.attempts,createdAt:row.created_at,nextAttemptAt:row.next_attempt_at,leaseExpiresAt:row.lease_expires_at,lastError:row.last_error}));
  }
  async sync(): Promise<void> {
    try { await this.manager.requestRun(); this.snapshot = { ...this.snapshot, error: null }; }
    catch (error) { this.snapshot = { ...this.snapshot, error: error instanceof Error ? error.message : 'Sin conexión' }; }
    await this.refresh();
  }
  async retryFailed(): Promise<void> {
    await this.db.runAsync("UPDATE sync_operations SET state='pending',next_attempt_at=?,last_error=NULL WHERE state='failed'", new Date().toISOString());
    await this.sync();
  }
  private async execute(operation: SyncOperation): Promise<void> {
    const client = getSupabaseClient();
    if (!client) throw new Error('Falta configuración.');
    const { data } = await client.auth.getSession();
    if (data.session?.user.id !== this.userId) throw new Error('La sesión cambió.');
    const p = operation.payload;
    let error: { message: string; code?: string } | null = null;
    switch (operation.type) {
      case 'set_post_like':
        ({ error } = await client.rpc('set_post_like', { operation_id: operation.id, target_post_id: String(p.postId), liked: p.liked === true })); break;
      case 'create_comment':
        ({ error } = await client.rpc('create_comment_idempotent', { operation_id: operation.id, comment_id: String(p.id), target_post_id: String(p.postId), comment_body: String(p.body), ...(p.parentId ? { parent_comment_id: String(p.parentId) } : {}) })); break;
      case 'create_post': {
        const path = this.userId + '/' + String(p.id) + '.jpg';
        await uploadPhoto('post-media', path, String(p.uri));
        ({ error } = await client.rpc('publish_post', { post_id: String(p.id), caption_text: String(p.caption), media_path: path, media_width: Number(p.width), media_height: Number(p.height) }));
        break;
      }
      case 'send_message':
        ({ error } = await client.rpc('send_message_idempotent', { operation_id: operation.id, message_id: String(p.id), target_conversation_id: String(p.conversationId), message_body: String(p.body) })); break;
      case 'mark_messages_read':
        ({ error } = await client.rpc('acknowledge_messages', { target_conversation_id: String(p.conversationId), through_message_id: String(p.messageId), mark_read: p.read !== false })); break;
      case 'follow':
        ({ error } = await client.rpc('request_follow', { operation_id: operation.id, target_user_id: String(p.profileId) })); break;
      case 'unfollow':
        ({ error } = await client.rpc('cancel_follow', { target_user_id: String(p.profileId) })); break;
      case 'mark_story_viewed':
        ({ error } = await client.from('story_views').upsert({ story_id: String(p.storyId), viewer_id: this.userId }, { onConflict: 'story_id,viewer_id', ignoreDuplicates: true })); break;
      default: throw new Error('Operación no soportada.');
    }
    if (error) {
      const failure = new Error(error.message);
      Object.assign(failure, { permanent: ['42501','23503','23514','22023','P0001'].includes(error.code ?? '') });
      throw failure;
    }
  }
}
