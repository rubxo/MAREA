import { useMemo } from 'react';
import { getSupabaseClient } from '@/data/remote/supabase-client';
import { SupabaseStoryRepository } from '@/data/repositories/story-repository';
import { useAuthSession } from '@/features/auth/auth-session-provider';

export function useStoryRepository() {
  const { state } = useAuthSession();
  const userId = state.status === 'authenticated' ? state.session.userId : null;
  const repository = useMemo(() => {
    const client = getSupabaseClient();
    return client && userId ? new SupabaseStoryRepository(client, userId) : null;
  }, [userId]);
  return { repository, userId };
}
