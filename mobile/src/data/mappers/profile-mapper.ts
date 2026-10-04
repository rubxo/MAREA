import { AppError } from '@/core/errors/app-error';
import { Profile } from '@/domain/models';
import { Relationship } from '@/features/social/relationship-state';

import { ProfileRecord } from '../remote/database.types';

type ProfileStats = Readonly<{
  followerCount: number;
  followingCount: number;
  postCount: number;
  relationship: Relationship | 'self';
  avatarUrl: string | null;
}>;

export function mapProfileRecord(record: ProfileRecord, stats: ProfileStats): Profile {
  if (!record.id || !record.username || !record.display_name) {
    throw new AppError('VALIDATION', 'El perfil remoto tiene datos inválidos.');
  }

  return {
    id: record.id,
    username: record.username,
    displayName: record.display_name,
    avatarUrl: stats.avatarUrl,
    isPrivate: record.is_private,
    bio: record.bio,
    followerCount: stats.followerCount,
    followingCount: stats.followingCount,
    postCount: stats.postCount,
    relationship: stats.relationship,
  };
}

