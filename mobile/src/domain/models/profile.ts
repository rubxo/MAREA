export type ProfileId = string;

export type ProfileSummary = Readonly<{
  id: ProfileId;
  username: string;
  displayName: string;
  avatarUrl: string | null;
  isPrivate: boolean;
}>;

export type Profile = ProfileSummary &
  Readonly<{
    bio: string;
    followerCount: number;
    followingCount: number;
    postCount: number;
    relationship: 'self' | 'none' | 'requested' | 'following';
  }>;

export type FollowRequest = Readonly<{
  id: string;
  requester: ProfileSummary;
  createdAt: string;
  status: 'pending' | 'accepted' | 'rejected';
}>;
