import { MareaSupabaseClient } from '../remote/supabase-client';
import { SupabaseAuthRepository } from './auth-repository';

function clientWithAuth(auth: object): MareaSupabaseClient {
  return { auth } as unknown as MareaSupabaseClient;
}

describe('SupabaseAuthRepository', () => {
  it('returns null when there is no persisted remote session', async () => {
    const repository = new SupabaseAuthRepository(
      clientWithAuth({
        getSession: jest.fn().mockResolvedValue({ data: { session: null }, error: null }),
      }),
    );

    await expect(repository.getSession()).resolves.toBeNull();
  });

  it('represents email confirmation without inventing an authenticated session', async () => {
    const signUp = jest.fn().mockResolvedValue({
      data: { session: null, user: { id: 'user-1' } },
      error: null,
    });
    const repository = new SupabaseAuthRepository(clientWithAuth({ signUp }));

    await expect(
      repository.signUp({
        email: ' LUNA@MAREA.TEST ',
        password: 'Wave1234',
        username: ' Luna ',
        displayName: ' Luna Márquez ',
      }),
    ).resolves.toEqual({ session: null, needsEmailVerification: true });

    expect(signUp).toHaveBeenCalledWith({
      email: 'luna@marea.test',
      password: 'Wave1234',
      options: { data: { username: 'luna', display_name: 'Luna Márquez' } },
    });
  });
});
