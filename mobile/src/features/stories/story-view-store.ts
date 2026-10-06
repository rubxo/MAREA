import { openDatabaseAsync, SQLiteDatabase } from 'expo-sqlite';
import { Platform } from 'react-native';

type Receipt = { story_id: string; viewed_at: string; expires_at: string };
let database: Promise<SQLiteDatabase> | undefined;

function openViews() {
  database ??= (async () => {
    const db = await openDatabaseAsync(Platform.OS === 'web' ? ':memory:' : 'marea-story-views.db');
    await db.execAsync(`PRAGMA journal_mode = WAL;
      CREATE TABLE IF NOT EXISTS viewed_stories (
        user_id TEXT NOT NULL, story_id TEXT NOT NULL, viewed_at TEXT NOT NULL,
        expires_at TEXT NOT NULL, pending INTEGER NOT NULL DEFAULT 1,
        PRIMARY KEY (user_id, story_id)
      );`);
    return db;
  })().catch((error: unknown) => { database = undefined; throw error; });
  return database;
}

export async function readStoryViews(userId: string): Promise<Map<string, string>> {
  const db = await openViews();
  await db.runAsync('DELETE FROM viewed_stories WHERE expires_at <= ?', new Date().toISOString());
  const rows = await db.getAllAsync<Receipt>('SELECT story_id, viewed_at FROM viewed_stories WHERE user_id = ?', userId);
  return new Map(rows.map((row) => [row.story_id, row.viewed_at]));
}

export async function rememberStoryView(userId: string, storyId: string, expiresAt: string): Promise<void> {
  const db = await openViews();
  await db.runAsync(
    'INSERT OR IGNORE INTO viewed_stories (user_id, story_id, viewed_at, expires_at) VALUES (?, ?, ?, ?)',
    userId, storyId, new Date().toISOString(), expiresAt,
  );
}

const syncing = new Set<string>();
export async function syncStoryViews(userId: string, send: (id: string, at: string) => Promise<void>): Promise<void> {
  if (syncing.has(userId)) return;
  syncing.add(userId);
  try {
    const db = await openViews();
    const rows = await db.getAllAsync<Receipt>(
      'SELECT story_id, viewed_at, expires_at FROM viewed_stories WHERE user_id = ? AND pending = 1 ORDER BY viewed_at, story_id', userId,
    );
    for (const row of rows) {
      if (Date.parse(row.expires_at) > Date.now()) await send(row.story_id, row.viewed_at);
      await db.runAsync('UPDATE viewed_stories SET pending = 0 WHERE user_id = ? AND story_id = ?', userId, row.story_id);
    }
  } finally { syncing.delete(userId); }
}
