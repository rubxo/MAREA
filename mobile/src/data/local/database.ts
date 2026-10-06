import { openDatabaseAsync, SQLiteDatabase } from 'expo-sqlite';
import { Platform } from 'react-native';

import { migrateDatabase } from './migrations';

export type LocalDatabase = SQLiteDatabase;

let databasePromise: Promise<LocalDatabase> | null = null;

async function createDatabase(): Promise<LocalDatabase> {
  const database = await openDatabaseAsync(Platform.OS === 'web' ? ':memory:' : 'marea.db');
  await database.execAsync('PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON;');
  await migrateDatabase(database);
  return database;
}

export function openLocalDatabase(): Promise<LocalDatabase> {
  databasePromise ??= createDatabase();
  return databasePromise;
}
