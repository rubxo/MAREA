import { Profile } from '../models';

export type AuthSession = Readonly<{
  userId: string;
  email: string;
  profile: Profile | null;
}>;

export type SignUpInput = Readonly<{
  email: string;
  password: string;
  username: string;
  displayName: string;
}>;

export type SignUpResult = Readonly<{
  session: AuthSession | null;
  needsEmailVerification: boolean;
}>;

export type UpdateProfileInput = Readonly<{
  username: string;
  displayName: string;
  bio: string;
  isPrivate: boolean;
  avatarPath?: string;
}>;

export interface AuthRepository {
  getSession(): Promise<AuthSession | null>;
  signIn(email: string, password: string): Promise<AuthSession>;
  signUp(input: SignUpInput): Promise<SignUpResult>;
  updateProfile(input: UpdateProfileInput): Promise<AuthSession>;
  signOut(): Promise<void>;
}
