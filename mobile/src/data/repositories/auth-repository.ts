import { Session } from '@supabase/supabase-js';

import { AppError, toAppError } from '@/core/errors/app-error';
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
    return {
      userId: session.user.id,
      email: session.user.email ?? '',
      profile: await loadProfileById(this.client, session.user.id),
    };
  }

  async getSession(): Promise<AuthSession | null> {
    const { data, error } = await this.client.auth.getSession();
    if (error) throw toAppError(error);
    return data.session ? this.mapSession(data.session) : null;
  }

  async signIn(email: string, password: string): Promise<AuthSession> {
    const { data, error } = await this.client.auth.signInWithPassword({
      email: email.trim().toLowerCase(),
      password,
    });
    if (error) throw toAppError(error);
    if (!data.session) throw new AppError('AUTH_REQUIRED', 'No se pudo iniciar la sesión.');
    return this.mapSession(data.session);
  }

  async signUp(input: SignUpInput): Promise<SignUpResult> {
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
    if (error) throw toAppError(error);

    return {
      session: data.session ? await this.mapSession(data.session) : null,
      needsEmailVerification: data.session === null,
    };
  }

  async updateProfile(input: UpdateProfileInput): Promise<AuthSession> {
    const { data: userData, error: userError } = await this.client.auth.getUser();
    if (userError) throw toAppError(userError);
    if (!userData.user) throw new AppError('AUTH_REQUIRED', 'Debes iniciar sesión.');

    const { error } = await this.client
      .from('profiles')
      .update({
        username: input.username.trim().toLowerCase(),
        display_name: input.displayName.trim(),
        bio: input.bio.trim(),
        is_private: input.isPrivate,
      })
      .eq('id', userData.user.id);
    if (error) throw toAppError(error);

    const { data: sessionData, error: sessionError } = await this.client.auth.getSession();
    if (sessionError) throw toAppError(sessionError);
    if (!sessionData.session) throw new AppError('AUTH_REQUIRED', 'Tu sesión expiró.');

    const session = await this.mapSession(sessionData.session);
    return { ...session, profile: requireProfile(session.profile) };
  }

  async signOut(): Promise<void> {
    const { error } = await this.client.auth.signOut();
    if (error) throw toAppError(error);
  }
}

