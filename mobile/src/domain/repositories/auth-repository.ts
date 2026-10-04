import { Profile } from '../models';

export type AuthSession = Readonly<{
  userId: string;
  email: string;
  profile: Profile | null;
}>;

export interface AuthRepository {
  getSession(): Promise<AuthSession | null>;
  signIn(email: string, password: string): Promise<AuthSession>;
  signUp(email: string, password: string): Promise<AuthSession>;
  signOut(): Promise<void>;
}
