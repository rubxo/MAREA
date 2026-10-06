const mockSqliteInstall = jest.fn();

jest.mock('expo-sqlite/localStorage/install', () => {
  mockSqliteInstall();
  return {};
});
jest.mock('@/data/local/auth-storage', () => jest.requireActual('@/data/local/auth-storage.web'));

describe('Supabase client web entry', () => {
  it('does not initialize the native SQLite localStorage adapter', () => {
    jest.isolateModules(() => {
      jest.requireActual('./supabase-client');
    });

    expect(mockSqliteInstall).not.toHaveBeenCalled();
  });
});
