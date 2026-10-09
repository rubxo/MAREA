import { openLocalDatabase } from './database.web';

describe('database web entry', () => {
  it('provides a web-safe database without loading expo-sqlite', async () => {
    const db = await openLocalDatabase();
    expect(db).toBeDefined();
    await expect(db.execAsync('PRAGMA user_version = 1')).resolves.toBeUndefined();
    await expect(db.getAllAsync('SELECT * FROM test')).resolves.toEqual([]);
    await expect(db.getFirstAsync('SELECT * FROM test')).resolves.toBeNull();
    await expect(db.runAsync('INSERT INTO test VALUES(1)')).resolves.toEqual({
      lastInsertRowId: 0,
      changes: 0,
    });
  });
});
