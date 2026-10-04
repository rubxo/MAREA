import { Subscription } from '@supabase/supabase-js';
import { createContext, PropsWithChildren, useCallback, useContext, useEffect, useMemo, useState } from 'react';

import { appEnvironment } from '@/core/config/env';
import { AppError } from '@/core/errors/app-error';
import { SupabaseAuthRepository } from '@/data/repositories/auth-repository';
import { getSupabaseClient } from '@/data/remote/supabase-client';
import {
  SignUpInput,
  SignUpResult,
  UpdateProfileInput,
} from '@/domain/repositories/auth-repository';

import { AuthState, resolveInitialAuthState } from './auth-session-state';

type AuthSessionContextValue = Readonly<{
  state: AuthState;
  signIn(email: string, password: string): Promise<void>;
  signUp(input: SignUpInput): Promise<SignUpResult>;
  updateProfile(input: UpdateProfileInput): Promise<void>;
  signOut(): Promise<void>;
}>;

const AuthSessionContext = createContext<AuthSessionContextValue | null>(null);

export function AuthSessionProvider({ children }: PropsWithChildren) {
  const client = useMemo(() => getSupabaseClient(), []);
  const repository = useMemo(() => (client ? new SupabaseAuthRepository(client) : null), [client]);
  const [state, setState] = useState<AuthState>({
    status: 'booting',
    mode: appEnvironment.mode,
  });

  const readRemoteState = useCallback(async (): Promise<AuthState> => {
    if (!repository) {
      return resolveInitialAuthState(appEnvironment, null);
    }

    const session = await repository.getSession();
    return resolveInitialAuthState(appEnvironment, session);
  }, [repository]);

  useEffect(() => {
    let active = true;
    let subscription: Subscription | undefined;

    const refresh = () => {
      void readRemoteState()
        .then((nextState) => {
          if (active) setState(nextState);
        })
        .catch(() => {
          if (active && appEnvironment.mode === 'remote') {
            setState({ status: 'anonymous', mode: 'remote' });
          }
        });
    };

    const initialTimer = setTimeout(refresh, 0);

    if (client) {
      subscription = client.auth.onAuthStateChange((event) => {
        if (!active) return;
        if (event === 'SIGNED_OUT') {
          setState({ status: 'anonymous', mode: 'remote' });
          return;
        }
        setTimeout(refresh, 0);
      }).data.subscription;
    }

    return () => {
      active = false;
      clearTimeout(initialTimer);
      subscription?.unsubscribe();
    };
  }, [client, readRemoteState]);

  const signIn = useCallback(
    async (email: string, password: string) => {
      if (!repository) throw new AppError('AUTH_REQUIRED', 'El modo demo no requiere ingreso.');
      const session = await repository.signIn(email, password);
      setState(resolveInitialAuthState(appEnvironment, session));
    },
    [repository],
  );

  const signUp = useCallback(
    async (input: SignUpInput) => {
      if (!repository) throw new AppError('AUTH_REQUIRED', 'El modo demo no requiere registro.');
      const result = await repository.signUp(input);
      if (result.session) setState(resolveInitialAuthState(appEnvironment, result.session));
      return result;
    },
    [repository],
  );

  const updateProfile = useCallback(
    async (input: UpdateProfileInput) => {
      if (!repository) return;
      const session = await repository.updateProfile(input);
      setState(resolveInitialAuthState(appEnvironment, session));
    },
    [repository],
  );

  const signOut = useCallback(async () => {
    if (!repository) return;
    await repository.signOut();
    setState({ status: 'anonymous', mode: 'remote' });
  }, [repository]);

  const value = useMemo(
    () => ({ state, signIn, signUp, updateProfile, signOut }),
    [signIn, signOut, signUp, state, updateProfile],
  );

  return <AuthSessionContext.Provider value={value}>{children}</AuthSessionContext.Provider>;
}

export function useAuthSession(): AuthSessionContextValue {
  const value = useContext(AuthSessionContext);
  if (!value) throw new Error('useAuthSession must be used inside AuthSessionProvider');
  return value;
}
