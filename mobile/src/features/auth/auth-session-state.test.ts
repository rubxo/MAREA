import { AuthSession } from '@/domain/repositories/auth-repository';

import { resolveInitialAuthState } from './auth-session-state';

const remoteSession: AuthSession = {
  userId: 'user-1',
  email: 'luna@marea.test',
  profile: null,
};

describe('resolveInitialAuthState', () => {
  it('never authenticates without a configured backend', () => {
    expect(resolveInitialAuthState({ mode: 'unconfigured' }, null)).toMatchObject({
      status: 'anonymous',
      mode: 'unconfigured',
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
