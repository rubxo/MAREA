import { openDatabaseAsync, SQLiteDatabase } from 'expo-sqlite';

import { migrateDatabase } from './migrations';

export type LocalDatabase = SQLiteDatabase;

let databasePromise: Promise<LocalDatabase> | null = null;

async function createDatabase(): Promise<LocalDatabase> {
  const database = await openDatabaseAsync('marea.db');
  await database.execAsync('PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON;');
  await migrateDatabase(database);
  return database;
}

export function openLocalDatabase(): Promise<LocalDatabase> {
  databasePromise ??= createDatabase();
  return databasePromise;
}
