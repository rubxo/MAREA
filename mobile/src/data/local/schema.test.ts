import { CURRENT_SCHEMA_VERSION, MIGRATIONS, migrateDatabase, SqlExecutor } from './migrations';

class FakeExecutor implements SqlExecutor {
  readonly executed: string[] = [];
  transactions = 0;

  constructor(private readonly version: number) {}

  async getFirstAsync<T>(): Promise<T | null> {
    return { user_version: this.version } as T;
  }

  async execAsync(sql: string): Promise<void> {
    this.executed.push(sql);
  }

  async withExclusiveTransactionAsync(task: (transaction: Pick<SqlExecutor, 'execAsync'>) => Promise<void>): Promise<void> {
    this.transactions += 1;
    await task(this);
  }
}

describe('local database migrations', () => {
  it('keeps migration versions unique and strictly ordered', () => {
    expect(MIGRATIONS.map((migration) => migration.version)).toEqual([1]);
    expect(new Set(MIGRATIONS.map((migration) => migration.version)).size).toBe(
      MIGRATIONS.length,
    );
    expect(CURRENT_SCHEMA_VERSION).toBe(1);
  });

  it('applies pending schema once inside an exclusive transaction', async () => {
    const database = new FakeExecutor(0);

    await migrateDatabase(database);

    expect(database.transactions).toBe(1);
    expect(database.executed.join('\n')).toContain('CREATE TABLE IF NOT EXISTS profiles');
    expect(database.executed.at(-1)).toBe('PRAGMA user_version = 1');
  });

  it('does nothing when the database already has the current version', async () => {
    const database = new FakeExecutor(CURRENT_SCHEMA_VERSION);

    await migrateDatabase(database);

    expect(database.transactions).toBe(0);
    expect(database.executed).toEqual([]);
  });
});
