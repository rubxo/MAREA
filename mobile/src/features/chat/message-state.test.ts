import type { Message } from '@/domain/models/chat';

import { advanceMessageStatus, mergeMessages } from './message-state';

const message: Message = { id: 'one', conversationId: 'room', senderId: 'peer', body: 'Hola',
  createdAt: '2026-01-01T10:00:00Z', status: 'pending', deliveredAt: null, readAt: null };

it('deduplicates an optimistic message echoed by Realtime and history', () => {
  const sent = { ...message, status: 'sent' as const };
  expect(mergeMessages([message], [sent, sent])).toEqual([sent]);
});

it('does not regress a read receipt when a stale page arrives', () => {
  const read = { ...message, status: 'read' as const, deliveredAt: '2026-01-01T10:01:00Z', readAt: '2026-01-01T10:02:00Z' };
  expect(mergeMessages([read], [{ ...message, status: 'sent' }])).toEqual([read]);
  expect(advanceMessageStatus('delivered', 'pending')).toBe('delivered');
});

it('retains older pages and deterministically orders equal timestamps', () => {
  const newer = { ...message, id: 'two', createdAt: '2026-01-02T10:00:00Z' };
  expect(mergeMessages([newer], [message, { ...message, id: 'aaa' }]).map((item) => item.id))
    .toEqual(['two', 'one', 'aaa']);
});
