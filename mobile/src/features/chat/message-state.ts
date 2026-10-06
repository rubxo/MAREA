import type { Message, MessageStatus } from '@/domain/models/chat';

const progress: Record<MessageStatus, number> = { failed: 0, pending: 1, sent: 2, delivered: 3, read: 4 };

export function advanceMessageStatus(previous: MessageStatus, incoming: MessageStatus): MessageStatus {
  return progress[incoming] > progress[previous] ? incoming : previous;
}

/** UUID identity reconciles optimistic, paginated and duplicate WebSocket deliveries. */
export function mergeMessages(previous: readonly Message[], incoming: readonly Message[]): Message[] {
  const byId = new Map(previous.map((message) => [message.id, message]));
  for (const message of incoming) {
    const existing = byId.get(message.id);
    byId.set(message.id, existing ? {
      ...message,
      status: advanceMessageStatus(existing.status, message.status),
      deliveredAt: existing.deliveredAt ?? message.deliveredAt,
      readAt: existing.readAt ?? message.readAt,
    } : message);
  }
  return [...byId.values()].sort((a, b) => b.createdAt.localeCompare(a.createdAt) || b.id.localeCompare(a.id));
}
