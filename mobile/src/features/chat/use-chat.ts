import { randomUUID } from 'expo-crypto';
import { useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AppState } from 'react-native';

import { getSupabaseClient } from '@/data/remote/supabase-client';
import { SupabaseChatRepository } from '@/data/repositories/chat-repository';
import type { Conversation, Message, MessageStatus } from '@/domain/models/chat';
import type { ProfileSummary } from '@/domain/models/profile';
import { useAuthSession } from '@/features/auth/auth-session-provider';
import { getSocialRuntime, SocialRuntime } from '@/services/sync/social-runtime';

import { mergeMessages } from './message-state';

function errorText(cause: unknown): string { return cause instanceof Error ? cause.message : 'No pudimos cargar los mensajes.'; }

function useChatResources() {
  const { state } = useAuthSession();
  const userId = state.status === 'authenticated' ? state.session.userId : null;
  const repository = useMemo(() => {
    const client = getSupabaseClient();
    return client && userId ? new SupabaseChatRepository(client, userId) : null;
  }, [userId]);
  const [runtime, setRuntime] = useState<SocialRuntime | null>(null);
  const [resourceError, setResourceError] = useState<string | null>(null);
  useEffect(() => {
    let active = true;
    if (userId) void getSocialRuntime(userId).then((value) => { if (active) setRuntime(value); })
      .catch((cause) => { if (active) setResourceError(errorText(cause)); });
    return () => { active = false; };
  }, [userId]);
  return { repository, runtime: runtime?.userId === userId ? runtime : null, userId, resourceError };
}

export function useInbox() {
  const { repository, runtime, resourceError } = useChatResources();
  const [conversations, setConversations] = useState<readonly Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [connected, setConnected] = useState(false);
  const alive = useRef(false);
  const epoch = useRef(0);
  const flight = useRef<number | null>(null);
  const refresh = useCallback(async () => {
    if (!repository || !runtime || flight.current === epoch.current || !alive.current) return;
    const token = epoch.current;
    flight.current = token;
    try {
      const rows = await repository.getInbox();
      if (!alive.current || token !== epoch.current) return;
      setConversations(rows); setError(null);
      await runtime.writeCache('chat:inbox', rows);
      // Delivery is acknowledged when the recipient actually fetches the message metadata.
      await Promise.all(rows.filter((row) => row.lastMessage && row.lastMessage.senderId !== runtime.userId)
        .map((row) => repository.acknowledge(row.id, row.lastMessage!.id, false)));
    } catch (cause) { if (alive.current && token === epoch.current) setError(errorText(cause)); }
    finally { if (flight.current === token) flight.current = null; if (alive.current && token === epoch.current) setLoading(false); }
  }, [repository, runtime]);

  useFocusEffect(useCallback(() => {
    alive.current = true; const token = ++epoch.current;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const schedule = () => { clearTimeout(timer); timer = setTimeout(() => void refresh(), 120); };
    setLoading(true);
    setConversations([]);
    if (runtime) void runtime.readCache<Conversation[]>('chat:inbox')
      .then((cached) => { if (alive.current && token === epoch.current && cached) setConversations(cached); })
      .catch((cause) => { if (alive.current && token === epoch.current) setError(errorText(cause)); })
      .finally(() => { if (alive.current && token === epoch.current) schedule(); });
    const dispose = repository?.subscribeInbox(schedule, (value) => { if (alive.current && token === epoch.current) setConnected(value); });
    const app = AppState.addEventListener('change', (next) => { if (next === 'active') schedule(); });
    return () => { alive.current = false; epoch.current++; clearTimeout(timer); dispose?.(); app.remove(); };
  }, [repository, runtime, refresh]));

  const startConversation = useCallback(async (username: string) => {
    if (!repository) throw new Error('Inicia sesión para enviar mensajes.');
    return repository.startConversation(username);
  }, [repository]);
  return { conversations, loading, error: error ?? resourceError, connected, refresh, startConversation };
}

export function useConversation(conversationId: string) {
  const { repository, runtime, userId, resourceError } = useChatResources();
  const [messages, setMessages] = useState<Message[]>([]);
  const [peer, setPeer] = useState<ProfileSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingOlder, setLoadingOlder] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [connected, setConnected] = useState(false);
  const [typing, setPeerTyping] = useState(false);
  const current = useRef<Message[]>([]);
  const cursor = useRef<string | null>(null);
  const alive = useRef(false);
  const epoch = useRef(0);
  const flight = useRef<number | null>(null);
  const acknowledged = useRef<string | null>(null);
  const channel = useRef<ReturnType<SupabaseChatRepository['subscribeConversation']> | null>(null);
  const typingSentAt = useRef(0);
  const cacheKey = `chat:messages:${conversationId}`;

  const apply = useCallback((incoming: readonly Message[]) => {
    current.current = mergeMessages(current.current, incoming);
    setMessages(current.current);
  }, []);

  const refresh = useCallback(async () => {
    if (!repository || !runtime || !alive.current || flight.current === epoch.current) return;
    const token = epoch.current;
    flight.current = token;
    try {
      const page = await repository.getMessages(conversationId, null, 40);
      if (!alive.current || token !== epoch.current) return;
      apply(page.items);
      cursor.current = page.nextCursor; setHasMore(Boolean(page.nextCursor));
      setError(null);
      await runtime.writeCache(cacheKey, current.current.slice(0, 300));
      const newest = page.items[0];
      if (newest && alive.current && token === epoch.current && acknowledged.current !== newest.id && AppState.currentState === 'active') {
        acknowledged.current = newest.id;
        await runtime.enqueue('mark_messages_read', { conversationId, messageId: newest.id, read: true });
        void runtime.sync();
      }
    } catch (cause) { if (alive.current && token === epoch.current) setError(errorText(cause)); }
    finally { if (flight.current === token) flight.current = null; if (alive.current && token === epoch.current) setLoading(false); }
  }, [repository, runtime, conversationId, cacheKey, apply]);

  useFocusEffect(useCallback(() => {
    alive.current = true; const token = ++epoch.current;
    acknowledged.current = null; current.current = []; cursor.current = null;
    setMessages([]); setPeer(null); setLoading(true); setHasMore(false);
    let timer: ReturnType<typeof setTimeout> | undefined;
    const schedule = () => { clearTimeout(timer); timer = setTimeout(() => void refresh(), 120); };
    let previousPending = runtime?.snapshot.pending ?? 0;
    const restorePending = async () => {
      if (!runtime || !userId) return;
      const pending = await runtime.pendingOperations();
      if (!alive.current || token !== epoch.current) return;
      const queued: Message[] = pending.filter((operation) => operation.type === 'send_message' && operation.payload.conversationId === conversationId)
        .map((operation) => ({ id: String(operation.payload.id), conversationId, senderId: userId,
          body: String(operation.payload.body), createdAt: String(operation.payload.createdAt ?? operation.createdAt),
          status: (operation.state === 'failed' ? 'failed' : 'pending') as MessageStatus, deliveredAt: null, readAt: null }));
      apply(queued);
      const failedIds = new Set(queued.filter((item) => item.status === 'failed').map((item) => item.id));
      if (failedIds.size) {
        current.current = current.current.map((item) => failedIds.has(item.id) && (item.status === 'pending' || item.status === 'failed') ? { ...item, status: 'failed' } : item);
        setMessages(current.current);
      }
    };
    if (runtime) void runtime.readCache<Message[]>(cacheKey).then(async (cached) => {
      if (!alive.current || token !== epoch.current) return;
      if (cached) apply(cached);
      await restorePending();
    }).catch((cause) => { if (alive.current && token === epoch.current) setError(errorText(cause)); })
      .finally(() => { if (alive.current && token === epoch.current) schedule(); });
    if (repository) {
      void repository.getInbox().then((rows) => { if (alive.current && token === epoch.current) setPeer(rows.find((row) => row.id === conversationId)?.members[0] ?? null); }).catch(() => undefined);
      channel.current = repository.subscribeConversation(conversationId, schedule,
        (value) => { if (alive.current && token === epoch.current) setPeerTyping(value); }, (value) => { if (alive.current && token === epoch.current) setConnected(value); });
    }
    const unsubscribe = runtime?.subscribe(() => {
      void restorePending().catch((cause) => { if (alive.current && token === epoch.current) setError(errorText(cause)); });
      if (runtime.snapshot.pending !== previousPending) { previousPending = runtime.snapshot.pending; schedule(); }
    });
    const app = AppState.addEventListener('change', (next) => {
      if (next === 'active') schedule();
      else channel.current?.typing(false);
    });
    return () => { alive.current = false; epoch.current++; clearTimeout(timer); channel.current?.typing(false); channel.current?.dispose(); channel.current = null; unsubscribe?.(); app.remove(); };
  }, [repository, runtime, userId, conversationId, cacheKey, apply, refresh]));

  const loadOlder = useCallback(async () => {
    if (!repository || !cursor.current || loadingOlder || !alive.current) return;
    const token = epoch.current;
    setLoadingOlder(true);
    try {
      const page = await repository.getMessages(conversationId, cursor.current, 40);
      if (!alive.current || token !== epoch.current) return;
      apply(page.items); cursor.current = page.nextCursor; setHasMore(Boolean(page.nextCursor));
    } catch (cause) { if (alive.current && token === epoch.current) setError(errorText(cause)); }
    finally { if (alive.current && token === epoch.current) setLoadingOlder(false); }
  }, [repository, conversationId, loadingOlder, apply]);

  const send = useCallback(async (body: string) => {
    if (!runtime || !userId) { const cause = new Error('Inicia sesión para enviar mensajes.'); setError(cause.message); throw cause; }
    const token = epoch.current;
    const message: Message = { id: randomUUID(), conversationId, senderId: userId, body: body.trim(),
      status: 'pending', createdAt: new Date().toISOString(), deliveredAt: null, readAt: null };
    try {
      await runtime.enqueue('send_message', { id: message.id, conversationId, body: message.body, createdAt: message.createdAt }, message.id);
      if (alive.current && token === epoch.current) { apply([message]); setError(null); await runtime.writeCache(cacheKey, current.current.slice(0, 300)); }
      void runtime.sync();
    } catch (cause) { if (alive.current && token === epoch.current) setError(errorText(cause)); throw cause; }
  }, [runtime, userId, conversationId, cacheKey, apply]);

  const setTyping = useCallback((value: boolean) => {
    if (!value || Date.now() - typingSentAt.current > 1000) {
      typingSentAt.current = Date.now(); channel.current?.typing(value);
    }
  }, []);
  return { messages, peer, userId, loading, loadingOlder, hasMore, error: error ?? resourceError, connected,
    typing, send, setTyping, refresh, loadOlder };
}
