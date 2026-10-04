import { AppError, toAppError } from '@/core/errors/app-error';
import { Profile } from '@/domain/models';
import { Relationship } from '@/features/social/relationship-state';

import { mapProfileRecord } from '../mappers/profile-mapper';
import { ProfileRecord } from '../remote/database.types';
import { MareaSupabaseClient } from '../remote/supabase-client';

async function resolveRelationship(
  client: MareaSupabaseClient,
  viewerId: string | null,
  profileId: string,
): Promise<Relationship | 'self'> {
  if (!viewerId) return 'none';
  if (viewerId === profileId) return 'self';

  const [follow, request] = await Promise.all([
    client
      .from('follows')
      .select('following_id')
      .eq('follower_id', viewerId)
      .eq('following_id', profileId)
      .maybeSingle(),
    client
      .from('follow_requests')
      .select('id')
      .eq('requester_id', viewerId)
      .eq('target_id', profileId)
      .eq('status', 'pending')
      .maybeSingle(),
  ]);

  if (follow.error) throw toAppError(follow.error);
  if (request.error) throw toAppError(request.error);
  if (follow.data) return 'following';
  if (request.data) return 'requested';
  return 'none';
}

async function countRows(
  query: PromiseLike<{ count: number | null; error: { message?: string; code?: string } | null }>,
): Promise<number> {
  const result = await query;
  if (result.error) throw toAppError(result.error);
  return result.count ?? 0;
}

async function resolveAvatarUrl(
  client: MareaSupabaseClient,
  avatarPath: string | null,
): Promise<string | null> {
  if (!avatarPath) return null;
  const { data, error } = await client.storage.from('avatars').createSignedUrl(avatarPath, 3600);
  if (error) throw toAppError(error);
  return data.signedUrl;
}

export async function loadProfileFromRecord(
  client: MareaSupabaseClient,
  record: ProfileRecord,
  viewerId: string | null,
): Promise<Profile> {
  const [followerCount, followingCount, postCount, relationship, avatarUrl] = await Promise.all([
    countRows(
      client.from('follows').select('*', { count: 'exact', head: true }).eq('following_id', record.id),
    ),
    countRows(
      client.from('follows').select('*', { count: 'exact', head: true }).eq('follower_id', record.id),
    ),
    countRows(
      client.from('posts').select('*', { count: 'exact', head: true }).eq('author_id', record.id),
    ),
    resolveRelationship(client, viewerId, record.id),
    resolveAvatarUrl(client, record.avatar_path),
  ]);

  return mapProfileRecord(record, {
    followerCount,
    followingCount,
    postCount,
    relationship,
    avatarUrl,
  });
}

export async function loadProfileById(
  client: MareaSupabaseClient,
  profileId: string,
): Promise<Profile | null> {
  const { data, error } = await client.from('profiles').select('*').eq('id', profileId).maybeSingle();
  if (error) throw toAppError(error);
  if (!data) return null;
  return loadProfileFromRecord(client, data, profileId);
}

export function requireProfile(profile: Profile | null): Profile {
  if (!profile) throw new AppError('NOT_FOUND', 'No encontramos ese perfil.');
  return profile;
}

