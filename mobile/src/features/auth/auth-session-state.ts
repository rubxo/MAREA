import { AppEnvironment } from '@/core/config/env';
import { AuthSession } from '@/domain/repositories/auth-repository';
export type AuthState =
  | Readonly<{ status: 'booting'; mode: AppEnvironment['mode'] }>
  | Readonly<{ status: 'anonymous'; mode: AppEnvironment['mode'] }>
  | Readonly<{ status: 'authenticated'; mode: 'remote'; session: AuthSession }>;
export function resolveInitialAuthState(environment: AppEnvironment, session: AuthSession | null): AuthState {
  if (environment.mode !== 'remote' || !session) return { status: 'anonymous', mode: environment.mode };
  return { status: 'authenticated', mode: 'remote', session };
}
