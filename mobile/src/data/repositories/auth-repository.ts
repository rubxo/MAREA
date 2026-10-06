import { Session } from '@supabase/supabase-js';

import { AppError, toAppError } from '@/core/errors/app-error';
import { withDeadline } from '@/core/with-deadline';
import {
  AuthRepository,
  AuthSession,
  SignUpInput,
  SignUpResult,
  UpdateProfileInput,
} from '@/domain/repositories/auth-repository';

import { MareaSupabaseClient } from '../remote/supabase-client';
import { loadProfileById, requireProfile } from './profile-loader';

export class SupabaseAuthRepository implements AuthRepository {
  constructor(private readonly client: MareaSupabaseClient) {}

  private async mapSession(session: Session): Promise<AuthSession> {
    const cacheKey = 'marea-profile:' + session.user.id;
    let profile: AuthSession['profile'] = null;
    try {
      profile = await loadProfileById(this.client, session.user.id);
      if (typeof localStorage !== 'undefined') localStorage.setItem(cacheKey, JSON.stringify(profile));
    } catch {
      // The persisted Supabase session establishes identity; cached data never creates a session.
      const cached = typeof localStorage !== 'undefined' ? localStorage.getItem(cacheKey) : null;
      if (cached) profile = JSON.parse(cached) as AuthSession['profile'];
    }
    return {
      userId: session.user.id,
      email: session.user.email ?? '',
      profile,
    };
  }

  async getSession(): Promise<AuthSession | null> {
    try {
      return await withDeadline(async (signal) => {
        const { data, error } = await this.client.auth.getSession();
        if (signal.aborted) return null;
        if (error) throw toAppError(error);
        return data.session ? this.mapSession(data.session) : null;
      }, 'Tiempo agotado al consultar sesión.', 8_000);
    } catch {
      return null;
    }
  }

  async signIn(email: string, password: string): Promise<AuthSession> {
    return withDeadline(async (signal) => {
      const { data, error } = await this.client.auth.signInWithPassword({
        email: email.trim().toLowerCase(),
        password,
      });
      if (signal.aborted) {
        throw new AppError('NETWORK', 'Se agotó el tiempo para conectar con el servidor.', true);
      }
      if (error) throw toAppError(error);
      if (!data.session) throw new AppError('AUTH_REQUIRED', 'No se pudo iniciar la sesión.');
      return this.mapSession(data.session);
    }, 'No pudimos conectar para iniciar sesión. Verifica que tu teléfono y PC compartan la misma red.', 12_000);
  }

  async signUp(input: SignUpInput): Promise<SignUpResult> {
    return withDeadline(async (signal) => {
    const { data, error } = await this.client.auth.signUp({
      email: input.email.trim().toLowerCase(),
      password: input.password,
      options: {
        data: {
          username: input.username.trim().toLowerCase(),
          display_name: input.displayName.trim(),
        },
      },
    });
    if (signal.aborted) {
      throw new AppError('NETWORK', 'Se agotó el tiempo para conectar con el servidor.', true);
    }
    if (error) throw toAppError(error);

    return {
      session: data.session ? await this.mapSession(data.session) : null,
      needsEmailVerification: data.session === null,
    };
    }, 'No pudimos conectar para crear la cuenta. Verifica que tu teléfono y PC compartan la misma red.', 12_000);
  }

  async updateProfile(input: UpdateProfileInput): Promise<AuthSession> {
    return withDeadline(async (signal) => {
    const { data: userData, error: userError } = await this.client.auth.getUser();
    if (signal.aborted) throw new AppError('NETWORK', 'Se agotó el tiempo para validar tu sesión.', true);
    if (userError) throw toAppError(userError);
    if (!userData.user) throw new AppError('AUTH_REQUIRED', 'Debes iniciar sesión.');

    const changes = {
      username: input.username.trim().toLowerCase(),
      display_name: input.displayName.trim(),
      bio: input.bio.trim(),
      is_private: input.isPrivate,
      ...(input.avatarPath === undefined ? {} : { avatar_path: input.avatarPath }),
    };
    const { error } = await this.client
      .from('profiles')
      .update(changes)
      .eq('id', userData.user.id)
      .abortSignal(signal);
    if (error) throw toAppError(error);

    const { data: sessionData, error: sessionError } = await this.client.auth.getSession();
    if (sessionError) throw toAppError(sessionError);
    if (!sessionData.session) throw new AppError('AUTH_REQUIRED', 'Tu sesión expiró.');

    const session = await this.mapSession(sessionData.session);
    return { ...session, profile: requireProfile(session.profile) };
    }, 'No pudimos confirmar el guardado del perfil. Revisa tu conexión y vuelve a abrir tu perfil.', 30_000);
  }

  async signOut(): Promise<void> {
    const { error } = await this.client.auth.signOut();
    if (error) throw toAppError(error);
  }
}
