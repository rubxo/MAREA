import { Profile, ProfileId } from '../models';

export interface SocialRepository {
  getProfile(username: string): Promise<Profile | null>;
  follow(profileId: ProfileId): Promise<'following' | 'requested'>;
  unfollow(profileId: ProfileId): Promise<void>;
  respondToRequest(requestId: string, accept: boolean): Promise<void>;
}
