import { randomUUID } from 'expo-crypto';
import { useCallback, useEffect, useMemo, useState } from 'react';

import { getSupabaseClient } from '@/data/remote/supabase-client';
import { SupabaseSocialRepository } from '@/data/repositories/social-repository';
import { FollowRequest } from '@/domain/models';

export function useFollowRequests(enabled: boolean) {
  const client = useMemo(() => (enabled ? getSupabaseClient() : null), [enabled]);
  const repository = useMemo(() => (client ? new SupabaseSocialRepository(client) : null), [client]);
  const [requests, setRequests] = useState<readonly FollowRequest[]>([]);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>(enabled ? 'loading' : 'ready');

  const load = useCallback(async () => {
    if (!repository) return;
    setStatus('loading');
    try {
      setRequests(await repository.listPendingRequests());
      setStatus('ready');
    } catch {
      setStatus('error');
    }
  }, [repository]);

  useEffect(() => {
    const timer = setTimeout(() => void load(), 0);
    return () => clearTimeout(timer);
  }, [load]);

  const respond = useCallback(
    async (requestId: string, accept: boolean) => {
      if (!repository) return;
      const previous = requests;
      setRequests((current) => current.filter((request) => request.id !== requestId));
      try {
        await repository.respondToRequest(requestId, accept, randomUUID());
      } catch (error) {
        setRequests(previous);
        throw error;
      }
    },
    [repository, requests],
  );

  return { requests, status, reload: load, respond } as const;
}
