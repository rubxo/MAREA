import type { RealtimeChannel } from '@supabase/supabase-js';

import { toAppError } from '@/core/errors/app-error';
import type { MareaSupabaseClient } from '@/data/remote/supabase-client';
import type { Conversation, Message } from '@/domain/models/chat';
import type { ChatRepository } from '@/domain/repositories/chat-repository';
import type { Page } from '@/domain/repositories/feed-repository';

export class SupabaseChatRepository implements ChatRepository {
  constructor(private readonly client: MareaSupabaseClient, private readonly userId: string) {}

  async getInbox(): Promise<readonly Conversation[]> {
    const { data, error } = await this.client.rpc('get_chat_inbox');
    if (error) throw toAppError(error);
    return Promise.all((data ?? []).map(async (row) => {
      let avatarUrl: string | null = null;
      if (row.peer_avatar_path) {
        const signed = await this.client.storage.from('avatars').createSignedUrl(row.peer_avatar_path, 3600);
        avatarUrl = signed.data?.signedUrl ?? null;
      }
      return {
        id: row.conversation_id,
        updatedAt: row.updated_at,
        unreadCount: Number(row.unread_count),
        members: [{ id: row.peer_id, username: row.peer_username, displayName: row.peer_display_name,
          avatarUrl, isPrivate: row.peer_is_private }],
        lastMessage: row.last_message_id ? {
          id: row.last_message_id, conversationId: row.conversation_id, senderId: row.last_sender_id,
          body: row.last_body, createdAt: row.last_created_at, status: 'sent' as const,
          deliveredAt: null, readAt: null,
        } : null,
      };
    }));
  }

  async startConversation(username: string): Promise<string> {
    const { data, error } = await this.client.rpc('get_or_create_direct_conversation', {
      target_username: username.trim().replace(/^@/, '').toLowerCase(),
    });
    if (error) throw toAppError(error);
    return data;
  }

  async getMessages(conversationId: string, cursor: string | null, limit = 40): Promise<Page<Message>> {
    let query = this.client.from('messages').select('*').eq('conversation_id', conversationId)
      .order('created_at', { ascending: false }).order('id', { ascending: false }).limit(limit + 1);
    if (cursor) {
      const boundary = JSON.parse(cursor) as { createdAt: string; id: string };
      if (!/^[0-9a-f-]{36}$/i.test(boundary.id) || !/^\d{4}-\d{2}-\d{2}T[\d:.+Z-]+$/.test(boundary.createdAt)) {
        throw new Error('Cursor de mensajes inválido.');
      }
      query = query.or(`created_at.lt.${boundary.createdAt},and(created_at.eq.${boundary.createdAt},id.lt.${boundary.id})`);
    }
    const { data, error } = await query;
    if (error) throw toAppError(error);
    const rows = (data ?? []).slice(0, limit);
    const receipts = rows.length ? await this.client.from('message_receipts').select('*')
      .in('message_id', rows.map((row) => row.id)) : { data: [], error: null };
    if (receipts.error) throw toAppError(receipts.error);
    const items: Message[] = rows.map((row) => {
      const receipt = receipts.data?.find((item) => item.message_id === row.id && item.user_id !== row.sender_id);
      return { id: row.id, conversationId: row.conversation_id, senderId: row.sender_id,
        body: row.body, createdAt: row.created_at,
        status: receipt?.read_at ? 'read' : receipt?.delivered_at ? 'delivered' : 'sent',
        deliveredAt: receipt?.delivered_at ?? null, readAt: receipt?.read_at ?? null };
    });
    const last = items[items.length - 1];
    return { items, nextCursor: data && data.length > limit && last ? JSON.stringify({ createdAt: last.createdAt, id: last.id }) : null };
  }

  async sendMessage(message: Message): Promise<void> {
    const { error } = await this.client.rpc('send_message_idempotent', {
      operation_id: message.id, message_id: message.id,
      target_conversation_id: message.conversationId, message_body: message.body,
    });
    if (error) throw toAppError(error);
  }

  async acknowledge(conversationId: string, throughMessageId: string, read: boolean): Promise<void> {
    const { error } = await this.client.rpc('acknowledge_messages', {
      target_conversation_id: conversationId, through_message_id: throughMessageId, mark_read: read,
    });
    if (error) throw toAppError(error);
  }

  markRead(conversationId: string, throughMessageId: string): Promise<void> {
    return this.acknowledge(conversationId, throughMessageId, true);
  }

  subscribeInbox(onChange: () => void, onConnection: (connected: boolean) => void): () => void {
    const channel = this.client.channel(`inbox:${this.userId}:${Date.now()}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'messages' }, onChange)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'message_receipts' }, onChange)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'conversations' }, onChange)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'conversation_members', filter: `user_id=eq.${this.userId}` }, onChange)
      .subscribe((status) => { onConnection(status === 'SUBSCRIBED'); if (status === 'SUBSCRIBED') onChange(); });
    return () => { void this.client.removeChannel(channel); };
  }

  subscribeConversation(conversationId: string, onChange: () => void, onTyping: (typing: boolean) => void,
    onConnection: (connected: boolean) => void): { dispose: () => void; typing: (typing: boolean) => void } {
    let ready = false;
    let expiry: ReturnType<typeof setTimeout> | undefined;
    const channel: RealtimeChannel = this.client.channel(`conversation:${conversationId}`, {
      config: { private: true, broadcast: { self: false } },
    }).on('broadcast', { event: 'typing' }, ({ payload }) => {
      if (payload?.userId === this.userId) return;
      clearTimeout(expiry);
      onTyping(payload?.typing === true);
      expiry = setTimeout(() => onTyping(false), 3500);
    }).on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: `conversation_id=eq.${conversationId}` }, onChange)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'message_receipts' }, onChange)
      .subscribe((status) => {
        ready = status === 'SUBSCRIBED'; onConnection(ready);
        if (ready) onChange();
      });
    return {
      typing: (typing) => { if (ready) void channel.send({ type: 'broadcast', event: 'typing', payload: { userId: this.userId, typing } }); },
      dispose: () => { clearTimeout(expiry); void this.client.removeChannel(channel); },
    };
  }
}
