import { getAppEnvironment } from './env';

describe('getAppEnvironment', () => {
  it('uses remote mode only when URL and publishable key are present', () => {
    expect(
      getAppEnvironment({
        EXPO_PUBLIC_SUPABASE_URL: 'https://demo.supabase.co',
        EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY: 'sb_publishable_demo',
      }),
    ).toEqual({
      mode: 'remote',
      supabaseUrl: 'https://demo.supabase.co',
      supabasePublishableKey: 'sb_publishable_demo',
    });
  });

  it.each([
    {},
    { EXPO_PUBLIC_SUPABASE_URL: 'https://demo.supabase.co' },
    { EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY: 'sb_publishable_demo' },
  ])('requires configuration instead of a simulated session', (source) => {
    expect(getAppEnvironment(source)).toEqual({ mode: 'unconfigured' });
  });

  it('never exposes an administrative key', () => {
    const environment = getAppEnvironment({
      EXPO_PUBLIC_SUPABASE_URL: 'https://demo.supabase.co',
      EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY: 'sb_publishable_demo',
      SUPABASE_SERVICE_ROLE_KEY: 'must-not-leak',
    });

    expect(JSON.stringify(environment)).not.toContain('must-not-leak');
    expect(environment).not.toHaveProperty('serviceRoleKey');
  });
});
