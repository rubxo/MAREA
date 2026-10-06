import { MareaSupabaseClient } from '../remote/supabase-client';
import { SupabaseAuthRepository } from './auth-repository';

function clientWithAuth(auth: object): MareaSupabaseClient {
  return { auth } as unknown as MareaSupabaseClient;
}

describe('SupabaseAuthRepository', () => {
  it('stops waiting when password authentication cannot reach the backend', async () => {
    jest.useFakeTimers();
    try {
      const repository = new SupabaseAuthRepository(
        clientWithAuth({ signInWithPassword: () => new Promise(() => {}) }),
      );
      const pending = repository.signIn('luna@example.com', 'Wave1234');
      const rejection = expect(pending).rejects.toThrow('No pudimos conectar para iniciar sesión');
      await jest.advanceTimersByTimeAsync(15_001);
      await rejection;
    } finally {
      jest.useRealTimers();
    }
  });

  it('stops waiting when account creation cannot reach the backend', async () => {
    jest.useFakeTimers();
    try {
      const repository = new SupabaseAuthRepository(
        clientWithAuth({ signUp: () => new Promise(() => {}) }),
      );
      const pending = repository.signUp({
        email: 'luna@example.com', password: 'Wave1234', username: 'luna', displayName: 'Luna',
      });
      const rejection = expect(pending).rejects.toThrow('No pudimos conectar para crear la cuenta');
      await jest.advanceTimersByTimeAsync(15_001);
      await rejection;
    } finally {
      jest.useRealTimers();
    }
  });

  it('releases saving and prevents a late write when identity validation hangs', async () => {
    jest.useFakeTimers();
    try {
      let finish!: (value: unknown) => void;
      const from = jest.fn();
      const repository = new SupabaseAuthRepository({
        auth: { getUser: () => new Promise(resolve => { finish = resolve; }) }, from,
      } as unknown as MareaSupabaseClient);
      const pending = repository.updateProfile({ username: 'luna', displayName: 'Luna', bio: '', isPrivate: false });
      const rejection = expect(pending).rejects.toThrow('No pudimos confirmar el guardado');
      await jest.advanceTimersByTimeAsync(30_001);
      await rejection;
      finish({ data: { user: { id: 'user-1' } }, error: null });
      await Promise.resolve();
      expect(from).not.toHaveBeenCalled();
    } finally {
      jest.useRealTimers();
    }
  });
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

  it('stores an uploaded avatar in the same profile update as the edited fields', async () => {
    const eq = jest.fn(() => ({ abortSignal: jest.fn().mockResolvedValue({ error: null }) }));
    const update = jest.fn(() => ({ eq }));
    const client = {
      auth: {
        getUser: jest.fn().mockResolvedValue({ data: { user: { id: 'user-1' } }, error: null }),
        getSession: jest.fn().mockResolvedValue({ data: { session: null }, error: null }),
      },
      from: jest.fn(() => ({ update })),
    } as unknown as MareaSupabaseClient;
    const repository = new SupabaseAuthRepository(client);

    await expect(repository.updateProfile({
      username: ' LUNA ',
      displayName: ' Luna Márquez ',
      bio: ' Hola ',
      isPrivate: true,
      avatarPath: 'user-1/new-avatar.jpg',
    })).rejects.toThrow('Tu sesión expiró.');

    expect(update).toHaveBeenCalledWith({
      username: 'luna',
      display_name: 'Luna Márquez',
      bio: 'Hola',
      is_private: true,
      avatar_path: 'user-1/new-avatar.jpg',
    });
    expect(eq).toHaveBeenCalledWith('id', 'user-1');
  });
});
