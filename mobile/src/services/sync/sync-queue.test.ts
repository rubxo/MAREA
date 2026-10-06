import type { SyncOperation } from '@/domain/models/sync';

import {
  MemorySyncOperationStore,
  SyncQueue,
  computeBackoffMs,
} from './sync-queue';

const now = new Date('2026-10-04T12:00:00.000Z');

describe('SyncQueue', () => {
  it('does not overtake a retrying like with a later unlike', async () => {
    const queue = new SyncQueue(new MemorySyncOperationStore(), () => now);
    await queue.enqueue({ id: 'like', type: 'set_post_like', payload: { liked: true } });
    await queue.enqueue({ id: 'unlike', type: 'set_post_like', payload: { liked: false } });
    expect((await queue.leaseNext())?.id).toBe('like');
    await queue.fail('like', new Error('offline'));
    expect(await queue.leaseNext()).toBeNull();
  });

  it('retains permanent failures but allows unrelated work to continue', async () => {
    const store = new MemorySyncOperationStore();
    const queue = new SyncQueue(store, () => now);
    await queue.enqueue({ id: 'denied', type: 'create_comment', payload: {} });
    await queue.enqueue({ id: 'allowed', type: 'create_comment', payload: {} });
    await queue.leaseNext();
    await queue.fail('denied', Object.assign(new Error('forbidden'), { permanent: true }));
    expect((await queue.leaseNext())?.id).toBe('allowed');
    expect(store.values().find(op => op.id === 'denied')?.nextAttemptAt).toMatch(/^9999/);
  });

  it('leases persisted operations in FIFO order and ignores duplicate ids', async () => {
    const store = new MemorySyncOperationStore();
    const queue = new SyncQueue(store, () => now);

    await queue.enqueue({ id: 'b', type: 'follow', payload: { profileId: '2' } });
    await queue.enqueue({ id: 'a', type: 'follow', payload: { profileId: '1' } });
    await queue.enqueue({ id: 'a', type: 'unfollow', payload: { profileId: '1' } });

    const first = await queue.leaseNext();
    expect(first?.id).toBe('b');
    await queue.complete('b');
    expect((await queue.leaseNext())?.id).toBe('a');
    expect(store.values()).toHaveLength(1);
  });

  it('does not lease an operation twice until its lease expires', async () => {
    let clock = now;
    const queue = new SyncQueue(new MemorySyncOperationStore(), () => clock, 30_000);
    await queue.enqueue({ id: 'like-1', type: 'set_post_like', payload: { liked: true } });

    expect((await queue.leaseNext())?.id).toBe('like-1');
    expect(await queue.leaseNext()).toBeNull();
    clock = new Date(now.getTime() + 30_001);
    expect((await queue.leaseNext())?.id).toBe('like-1');
  });

  it('schedules retryable failures with capped exponential backoff', async () => {
    let clock = now;
    const store = new MemorySyncOperationStore();
    const queue = new SyncQueue(store, () => clock);
    await queue.enqueue({ id: 'comment-1', type: 'create_comment', payload: {} });
    await queue.leaseNext();
    await queue.fail('comment-1', new Error('offline'));

    expect(await queue.leaseNext()).toBeNull();
    clock = new Date(now.getTime() + computeBackoffMs(1));
    expect((await queue.leaseNext())?.id).toBe('comment-1');
    expect(computeBackoffMs(99)).toBe(300_000);
  });
});

describe('MemorySyncOperationStore', () => {
  it('preserves the operation contract', async () => {
    const store = new MemorySyncOperationStore();
    const operation: SyncOperation = {
      id: '1', type: 'follow', payload: {}, state: 'pending', attempts: 0,
      createdAt: now.toISOString(), nextAttemptAt: now.toISOString(),
      leaseExpiresAt: null, lastError: null,
    };
    await store.insert(operation);
    expect(store.values()).toEqual([operation]);
  });
});
