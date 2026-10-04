import { AppEnvironment } from '@/core/config/env';
import { AuthSession } from '@/domain/repositories/auth-repository';
import { demoUser } from '@/features/demo/demo-session';

export type AuthState =
  | Readonly<{ status: 'booting'; mode: AppEnvironment['mode'] }>
  | Readonly<{ status: 'anonymous'; mode: 'remote' }>
  | Readonly<{
      status: 'authenticated';
      mode: AppEnvironment['mode'];
      session: AuthSession;
    }>;

const demoSession: AuthSession = {
  userId: demoUser.id,
  email: 'demo@marea.local',
  profile: {
    id: demoUser.id,
    username: demoUser.username,
    displayName: demoUser.displayName,
    avatarUrl: demoUser.avatarUrl,
    isPrivate: false,
    bio: demoUser.bio,
    followerCount: demoUser.followers,
    followingCount: demoUser.following,
    postCount: demoUser.posts,
    relationship: 'self',
  },
};

export function resolveInitialAuthState(
  environment: AppEnvironment,
  session: AuthSession | null,
): AuthState {
  if (environment.mode === 'demo') {
    return { status: 'authenticated', mode: 'demo', session: demoSession };
  }

  if (!session) return { status: 'anonymous', mode: 'remote' };

  return { status: 'authenticated', mode: 'remote', session };
}

