import { MareaSupabaseClient } from '@/data/remote/supabase-client';
import { Story } from '@/domain/models/story';
import { StoryRepository } from '@/domain/repositories/story-repository';

export type StoryCursor = Readonly<{ createdAt: string; id: string }>;
export type StoryPage = Readonly<{ stories: Story[]; next: StoryCursor | null }>;
const PAGE_SIZE = 24;

export class SupabaseStoryRepository implements StoryRepository {
  constructor(private readonly client: MareaSupabaseClient, private readonly userId: string) {}

  async getActiveStories(): Promise<readonly Story[]> { return (await this.getPage()).stories; }

  async getPage(cursor?: StoryCursor, authorId?: string): Promise<StoryPage> {
    let query = this.client.from('stories').select('*').gt('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false }).order('id', { ascending: false }).limit(PAGE_SIZE);
    if (authorId) query = query.eq('author_id', authorId);
    if (cursor) query = query.or(`created_at.lt.${cursor.createdAt},and(created_at.eq.${cursor.createdAt},id.lt.${cursor.id})`);
    const { data: rows, error } = await query;
    if (error) throw error;
    if (!rows?.length) return { stories: [], next: null };
    const stories = await this.hydrate(rows);
    const last = rows[rows.length - 1];
    return { stories, next: rows.length === PAGE_SIZE && last ? { id: last.id, createdAt: last.created_at } : null };
  }

  async getStory(id: string): Promise<Story | null> {
    const { data, error } = await this.client.from('stories').select('*').eq('id', id)
      .gt('expires_at', new Date().toISOString()).maybeSingle();
    if (error) throw error;
    return data ? (await this.hydrate([data]))[0] ?? null : null;
  }

  private async hydrate(rows: { id: string; author_id: string; storage_path: string; created_at: string; expires_at: string }[]): Promise<Story[]> {
    const [profilesResult, viewsResult] = await Promise.all([
      this.client.from('profiles').select('*').in('id', [...new Set(rows.map((row) => row.author_id))]),
      this.client.from('story_views').select('story_id, viewed_at').eq('viewer_id', this.userId).in('story_id', rows.map((row) => row.id)),
    ]);
    if (profilesResult.error) throw profilesResult.error;
    if (viewsResult.error) throw viewsResult.error;
    const profiles = new Map((profilesResult.data ?? []).map((row) => [row.id, row]));
    const views = new Map((viewsResult.data ?? []).map((row) => [row.story_id, row.viewed_at]));
    return Promise.all(rows.map(async (row) => {
      const profile = profiles.get(row.author_id);
      if (!profile) throw new Error('El perfil de esta historia ya no está disponible.');
      const lifetime = Math.max(1, Math.min(300, Math.floor((Date.parse(row.expires_at) - Date.now()) / 1000)));
      const media = await this.client.storage.from('story-media').createSignedUrl(row.storage_path, lifetime);
      if (media.error) throw media.error;
      const avatar = profile.avatar_path ? await this.client.storage.from('avatars').createSignedUrl(profile.avatar_path, 300) : null;
      return {
        id: row.id, mediaUrl: media.data.signedUrl, createdAt: row.created_at, expiresAt: row.expires_at,
        viewedAt: views.get(row.id) ?? null,
        author: { id: profile.id, username: profile.username, displayName: profile.display_name,
          avatarUrl: avatar?.data?.signedUrl ?? null, isPrivate: profile.is_private },
      };
    }));
  }

  async markViewed(storyId: string, viewedAt: string): Promise<void> {
    const { error } = await this.client.from('story_views').insert({ story_id: storyId, viewer_id: this.userId, viewed_at: viewedAt });
    if (error && error.code !== '23505') throw error;
  }

  async create(id: string, storagePath: string, width: number, height: number): Promise<void> {
    const { error } = await this.client.from('stories').insert({ id, author_id: this.userId, storage_path: storagePath, width, height });
    if (error) {
      // A repeated publish after a lost response succeeds only for the same owned story.
      if (error.code === '23505') {
        const { data } = await this.client.from('stories').select('id').eq('id', id).eq('author_id', this.userId).eq('storage_path', storagePath).maybeSingle();
        if (data) return;
      }
      throw error;
    }
  }
}
