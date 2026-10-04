export type SyncOperationType =
  | 'set_post_like'
  | 'create_comment'
  | 'create_post'
  | 'follow'
  | 'unfollow'
  | 'mark_story_viewed'
  | 'send_message'
  | 'mark_messages_read';

export type SyncOperation = Readonly<{
  id: string;
  type: SyncOperationType;
  payload: Readonly<Record<string, unknown>>;
  state: 'pending' | 'processing' | 'failed';
  attempts: number;
  createdAt: string;
  nextAttemptAt: string;
  leaseExpiresAt: string | null;
  lastError: string | null;
}>;
