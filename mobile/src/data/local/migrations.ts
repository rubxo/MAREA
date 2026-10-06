import { INITIAL_SCHEMA_SQL } from './schema';

export interface SqlExecutor {
  getFirstAsync<T>(sql: string): Promise<T | null>;
  execAsync(sql: string): Promise<void>;
  withExclusiveTransactionAsync(task: (transaction: Pick<SqlExecutor, 'execAsync'>) => Promise<void>): Promise<void>;
}

export type Migration = Readonly<{ version: number; sql: string }>;

export const MIGRATIONS: readonly Migration[] = [
  { version: 1, sql: INITIAL_SCHEMA_SQL },
];

export const CURRENT_SCHEMA_VERSION = MIGRATIONS.at(-1)?.version ?? 0;

export async function migrateDatabase(database: SqlExecutor): Promise<void> {
  const row = await database.getFirstAsync<{ user_version: number }>(
    'PRAGMA user_version',
  );
  const currentVersion = row?.user_version ?? 0;

  if (currentVersion > CURRENT_SCHEMA_VERSION) {
    throw new Error(
      `Database version ${currentVersion} is newer than supported ${CURRENT_SCHEMA_VERSION}`,
    );
  }

  const pending = MIGRATIONS.filter(
    (migration) => migration.version > currentVersion,
  );
  if (pending.length === 0) return;

  await database.withExclusiveTransactionAsync(async (transaction) => {
    for (const migration of pending) {
      await transaction.execAsync(migration.sql);
      await transaction.execAsync(`PRAGMA user_version = ${migration.version}`);
    }
  });
}
