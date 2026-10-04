import { useCallback, useEffect, useMemo, useState } from 'react';

import { getSupabaseClient } from '@/data/remote/supabase-client';
import { SupabaseSocialRepository } from '@/data/repositories/social-repository';
import { Profile } from '@/domain/models';

export type ProfileQueryState =
  | Readonly<{ status: 'loading' }>
  | Readonly<{ status: 'ready'; profile: Profile }>
  | Readonly<{ status: 'empty' }>
  | Readonly<{ status: 'error'; message: string }>;

export function useProfile(username: string) {
  const client = useMemo(() => getSupabaseClient(), []);
  const repository = useMemo(() => (client ? new SupabaseSocialRepository(client) : null), [client]);
  const [state, setState] = useState<ProfileQueryState>({ status: 'loading' });
  const [revision, setRevision] = useState(0);

  const reload = useCallback(() => setRevision((value) => value + 1), []);

  useEffect(() => {
    let active = true;
    if (!repository) {
      setTimeout(() => {
        if (active) setState({ status: 'empty' });
      }, 0);
      return () => {
        active = false;
      };
    }

    setTimeout(() => {
      if (active) setState({ status: 'loading' });
    }, 0);

    void repository
      .getProfile(username)
      .then((profile) => {
        if (!active) return;
        setState(profile ? { status: 'ready', profile } : { status: 'empty' });
      })
      .catch(() => {
        if (active) setState({ status: 'error', message: 'No pudimos cargar este perfil.' });
      });

    return () => {
      active = false;
    };
  }, [repository, revision, username]);

  return { state, reload, repository } as const;
}

