import { AuthSession } from '@/domain/repositories/auth-repository';

import { resolveInitialAuthState } from './auth-session-state';

const remoteSession: AuthSession = {
  userId: 'user-1',
  email: 'luna@marea.test',
  profile: null,
};

describe('resolveInitialAuthState', () => {
  it('creates an explicit demo session when remote credentials are absent', () => {
    expect(resolveInitialAuthState({ mode: 'demo' }, null)).toMatchObject({
      status: 'authenticated',
      mode: 'demo',
      session: { userId: 'user-valeria', profile: { username: 'valeria.m' } },
    });
  });

  it('keeps a remote app anonymous when Supabase has no session', () => {
    expect(
      resolveInitialAuthState(
        {
          mode: 'remote',
          supabaseUrl: 'https://project.supabase.co',
          supabasePublishableKey: 'publishable-key',
        },
        null,
      ),
    ).toEqual({ status: 'anonymous', mode: 'remote' });
  });

  it('restores a remote authenticated session without changing its shape', () => {
    expect(
      resolveInitialAuthState(
        {
          mode: 'remote',
          supabaseUrl: 'https://project.supabase.co',
          supabasePublishableKey: 'publishable-key',
        },
        remoteSession,
      ),
    ).toEqual({ status: 'authenticated', mode: 'remote', session: remoteSession });
  });
});
