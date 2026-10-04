import { Conversation, Message } from '../models';
import { Page } from './feed-repository';

export interface ChatRepository {
  getInbox(): Promise<readonly Conversation[]>;
  getMessages(conversationId: string, cursor: string | null, limit: number): Promise<Page<Message>>;
  sendMessage(message: Message): Promise<void>;
  markRead(conversationId: string, throughMessageId: string): Promise<void>;
}
