import { MemorySyncOperationStore, SyncQueue } from './sync-queue';
import { SyncManager } from './sync-manager';

describe('SyncManager', () => {
  it('uses one worker when concurrent callers request a run', async () => {
    const queue = new SyncQueue(new MemorySyncOperationStore());
    await queue.enqueue({ id: '1', type: 'follow', payload: {} });
    let active = 0;
    let maximumActive = 0;
    const manager = new SyncManager(queue, {
      execute: async () => {
        active += 1;
        maximumActive = Math.max(maximumActive, active);
        await Promise.resolve();
        active -= 1;
      },
    });

    await Promise.all([manager.requestRun(), manager.requestRun(), manager.requestRun()]);
    expect(maximumActive).toBe(1);
    expect(await queue.leaseNext()).toBeNull();
  });

  it('keeps a retryable failure queued', async () => {
    const store = new MemorySyncOperationStore();
    const queue = new SyncQueue(store);
    await queue.enqueue({ id: '1', type: 'follow', payload: {} });
    const manager = new SyncManager(queue, { execute: async () => { throw new Error('offline'); } });

    await manager.requestRun();
    expect(store.values()[0]).toMatchObject({ state: 'failed', attempts: 1 });
  });
});
