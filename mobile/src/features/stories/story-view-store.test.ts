import { openDatabaseAsync } from 'expo-sqlite';
import { readStoryViews, rememberStoryView, syncStoryViews } from './story-view-store';

jest.mock('expo-sqlite', () => ({ openDatabaseAsync: jest.fn() }));
const db = { execAsync: jest.fn(), runAsync: jest.fn(), getAllAsync: jest.fn() };
const future = '2099-10-05T00:00:00.000Z';

beforeAll(() => { (openDatabaseAsync as jest.Mock).mockResolvedValue(db); });
beforeEach(() => { jest.clearAllMocks(); db.getAllAsync.mockResolvedValue([]); });

describe('durable story view receipts', () => {
  it('isolates viewed state by the signed-in user and preserves the first view', async () => {
    await rememberStoryView('alice', 'story-a', future);
    expect(db.runAsync).toHaveBeenCalledWith(expect.stringContaining('INSERT OR IGNORE'), 'alice', 'story-a', expect.any(String), future);
    db.getAllAsync.mockResolvedValue([{ story_id: 'story-a', viewed_at: '2026-10-04T00:00:00.000Z' }]);
    const views = await readStoryViews('alice');
    expect(db.getAllAsync).toHaveBeenCalledWith(expect.stringContaining('WHERE user_id = ?'), 'alice');
    expect(views.get('story-a')).toBe('2026-10-04T00:00:00.000Z');
  });

  it('keeps failed receipts pending and retries in chronological order', async () => {
    db.getAllAsync.mockResolvedValue([
      { story_id: 'first', viewed_at: '2026-10-04T00:00:00Z', expires_at: future },
      { story_id: 'second', viewed_at: '2026-10-04T00:00:01Z', expires_at: future },
    ]);
    const send = jest.fn().mockRejectedValueOnce(new Error('offline')).mockResolvedValue(undefined);
    await expect(syncStoryViews('alice', send)).rejects.toThrow('offline');
    expect(db.runAsync).not.toHaveBeenCalled();
    await syncStoryViews('alice', send);
    expect(send.mock.calls.map(([id]) => id)).toEqual(['first', 'first', 'second']);
    expect(db.runAsync).toHaveBeenNthCalledWith(1, expect.stringContaining('SET pending = 0'), 'alice', 'first');
    expect(db.runAsync).toHaveBeenNthCalledWith(2, expect.stringContaining('SET pending = 0'), 'alice', 'second');
  });

  it('does not send an expired view to a backend that correctly rejects expired stories', async () => {
    db.getAllAsync.mockResolvedValue([{ story_id: 'expired', viewed_at: '2000-01-01T00:00:00Z', expires_at: '2000-01-02T00:00:00Z' }]);
    const send = jest.fn();
    await syncStoryViews('alice', send);
    expect(send).not.toHaveBeenCalled();
    expect(db.runAsync).toHaveBeenCalledWith(expect.stringContaining('SET pending = 0'), 'alice', 'expired');
  });
});
