export type LocalDatabase = {
  execAsync(sql: string): Promise<void>;
  runAsync(sql: string, ...params: unknown[]): Promise<{ lastInsertRowId: number; changes: number }>;
  getFirstAsync<T>(sql: string, ...params: unknown[]): Promise<T | null>;
  getAllAsync<T>(sql: string, ...params: unknown[]): Promise<T[]>;
  withExclusiveTransactionAsync<T>(task: (txn: LocalDatabase) => Promise<T>): Promise<T>;
};

let databasePromise: Promise<LocalDatabase> | null = null;

const inMemoryWebDatabase: LocalDatabase = {
  async execAsync() {},
  async runAsync() {
    return { lastInsertRowId: 0, changes: 0 };
  },
  async getFirstAsync() {
    return null;
  },
  async getAllAsync() {
    return [];
  },
  async withExclusiveTransactionAsync(task) {
    return task(this);
  },
};

export function openLocalDatabase(): Promise<LocalDatabase> {
  databasePromise ??= Promise.resolve(inMemoryWebDatabase);
  return databasePromise;
}
