import { ProfileSummary } from './profile';

export type MessageStatus = 'pending' | 'sent' | 'delivered' | 'read' | 'failed';

export type Message = Readonly<{
  id: string;
  conversationId: string;
  senderId: string;
  body: string;
  status: MessageStatus;
  createdAt: string;
  deliveredAt: string | null;
  readAt: string | null;
}>;

export type Conversation = Readonly<{
  id: string;
  members: readonly ProfileSummary[];
  lastMessage: Message | null;
  unreadCount: number;
  updatedAt: string;
}>;
