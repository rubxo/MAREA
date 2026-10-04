import { FollowRequest, Profile, ProfileId } from '../models';

export interface SocialRepository {
  getProfile(username: string): Promise<Profile | null>;
  listPendingRequests(): Promise<readonly FollowRequest[]>;
  follow(profileId: ProfileId, operationId: string): Promise<'following' | 'requested'>;
  unfollow(profileId: ProfileId): Promise<void>;
  respondToRequest(requestId: string, accept: boolean, operationId: string): Promise<void>;
}
