import { Platform } from 'react-native';
import { SocialRuntime } from './social-runtime';

const mockOpenDatabaseAsync = jest.fn();

jest.mock('expo-crypto', () => ({ randomUUID: () => 'test-operation-id' }));
jest.mock('expo-sqlite', () => ({
  openDatabaseAsync: (...args: unknown[]) => mockOpenDatabaseAsync(...args),
}));
jest.mock('@/data/remote/supabase-client', () => ({ getSupabaseClient: jest.fn() }));
jest.mock('@/services/media/upload-photo', () => ({ uploadPhoto: jest.fn() }));

Object.defineProperty(Platform, 'OS', { configurable: true, value: 'web' });

describe('SocialRuntime on web', () => {
  beforeEach(() => {
    mockOpenDatabaseAsync.mockReset();
    const values = new Map<string, string>();
    Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: {
      getItem: (key: string) => values.get(key) ?? null,
      setItem: (key: string, value: string) => { values.set(key, value); },
      removeItem: (key: string) => { values.delete(key); },
      clear: () => values.clear(),
      key: (index: number) => [...values.keys()][index] ?? null,
      get length() { return values.size; },
    } });
  });

  it('uses browser storage without opening an OPFS SQLite worker', async () => {
    mockOpenDatabaseAsync.mockRejectedValue(
      new DOMException('another access handle is already open', 'NoModificationAllowedError'),
    );

    await expect(SocialRuntime.open('web-user')).resolves.toBeDefined();
    expect(mockOpenDatabaseAsync).not.toHaveBeenCalled();
  });
});
