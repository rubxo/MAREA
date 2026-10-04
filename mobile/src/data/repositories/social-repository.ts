import { AppError, toAppError } from '@/core/errors/app-error';
import { FollowRequest, Profile, ProfileId, ProfileSummary } from '@/domain/models';
import { SocialRepository } from '@/domain/repositories/social-repository';

import { Json } from '../remote/database.types';
import { MareaSupabaseClient } from '../remote/supabase-client';
import { loadProfileFromRecord } from './profile-loader';

function readFollowStatus(value: Json): 'following' | 'requested' {
  if (
    value !== null &&
    !Array.isArray(value) &&
    typeof value === 'object' &&
    (value.status === 'following' || value.status === 'requested')
  ) {
    return value.status;
  }
  throw new AppError('VALIDATION', 'El servidor devolvió una respuesta inválida.');
}

export class SupabaseSocialRepository implements SocialRepository {
  constructor(private readonly client: MareaSupabaseClient) {}

  async getProfile(username: string): Promise<Profile | null> {
    const [{ data: profile, error }, { data: authData, error: authError }] = await Promise.all([
      this.client
        .from('profiles')
        .select('*')
        .eq('username', username.trim().toLowerCase())
        .maybeSingle(),
      this.client.auth.getUser(),
    ]);
    if (error) throw toAppError(error);
    if (authError) throw toAppError(authError);
    if (!profile) return null;
    return loadProfileFromRecord(this.client, profile, authData.user?.id ?? null);
  }

  async listPendingRequests(): Promise<readonly FollowRequest[]> {
    const { data: authData, error: authError } = await this.client.auth.getUser();
    if (authError) throw toAppError(authError);
    if (!authData.user) throw new AppError('AUTH_REQUIRED', 'Debes iniciar sesión.');

    const { data: requests, error } = await this.client
      .from('follow_requests')
      .select('*')
      .eq('target_id', authData.user.id)
      .eq('status', 'pending')
      .order('created_at', { ascending: false });
    if (error) throw toAppError(error);
    if (!requests.length) return [];

    const requesterIds = [...new Set(requests.map((request) => request.requester_id))];
    const { data: profiles, error: profileError } = await this.client
      .from('profiles')
      .select('*')
      .in('id', requesterIds);
    if (profileError) throw toAppError(profileError);

    const summaries = new Map<string, ProfileSummary>();
    await Promise.all(
      profiles.map(async (profile) => {
        let avatarUrl: string | null = null;
        if (profile.avatar_path) {
          const signed = await this.client.storage.from('avatars').createSignedUrl(profile.avatar_path, 3600);
          if (signed.error) throw toAppError(signed.error);
          avatarUrl = signed.data.signedUrl;
        }
        summaries.set(profile.id, {
          id: profile.id,
          username: profile.username,
          displayName: profile.display_name,
          avatarUrl,
          isPrivate: profile.is_private,
        });
      }),
    );

    return requests.flatMap((request) => {
      const requester = summaries.get(request.requester_id);
      return requester
        ? [{ id: request.id, requester, createdAt: request.created_at, status: 'pending' as const }]
        : [];
    });
  }

  async follow(profileId: ProfileId, operationId: string): Promise<'following' | 'requested'> {
    const { data, error } = await this.client.rpc('request_follow', {
      operation_id: operationId,
      target_user_id: profileId,
    });
    if (error) throw toAppError(error);
    return readFollowStatus(data);
  }

  async unfollow(profileId: ProfileId): Promise<void> {
    const { data: authData, error: authError } = await this.client.auth.getUser();
    if (authError) throw toAppError(authError);
    if (!authData.user) throw new AppError('AUTH_REQUIRED', 'Debes iniciar sesión.');

    const { error } = await this.client
      .from('follows')
      .delete()
      .eq('follower_id', authData.user.id)
      .eq('following_id', profileId);
    if (error) throw toAppError(error);
  }

  async respondToRequest(requestId: string, accept: boolean, operationId: string): Promise<void> {
    const { error } = await this.client.rpc('respond_follow_request', {
      operation_id: operationId,
      target_request_id: requestId,
      decision: accept ? 'accepted' : 'rejected',
    });
    if (error) throw toAppError(error);
  }
}
