import { DataMappingError, mapPostRow } from './post-mapper';

const validRow = {
  id: 'post-1',
  author_id: 'user-1',
  author_username: 'linafilm',
  author_display_name: 'Lina Cárdenas',
  author_avatar_url: 'https://example.com/avatar.jpg',
  author_is_private: 0,
  caption: 'La ciudad respira.',
  media_url: 'https://example.com/photo.jpg',
  media_width: 1200,
  media_height: 1500,
  like_count: 42,
  comment_count: 7,
  viewer_has_liked: 1,
  created_at: '2026-10-03T18:00:00.000Z',
};

describe('mapPostRow', () => {
  it('maps a validated SQLite or RPC row into the domain model', () => {
    expect(mapPostRow(validRow)).toEqual({
      id: 'post-1',
      author: {
        id: 'user-1',
        username: 'linafilm',
        displayName: 'Lina Cárdenas',
        avatarUrl: 'https://example.com/avatar.jpg',
        isPrivate: false,
      },
      caption: 'La ciudad respira.',
      media: {
        url: 'https://example.com/photo.jpg',
        width: 1200,
        height: 1500,
      },
      likeCount: 42,
      commentCount: 7,
      viewerHasLiked: true,
      createdAt: '2026-10-03T18:00:00.000Z',
    });
  });

  it('rejects incomplete rows at the data boundary', () => {
    expect(() => mapPostRow({ ...validRow, id: undefined })).toThrow(
      DataMappingError,
    );
  });

  it('rejects invalid counters and timestamps', () => {
    expect(() => mapPostRow({ ...validRow, like_count: -1 })).toThrow(
      'like_count',
    );
    expect(() => mapPostRow({ ...validRow, created_at: 'yesterday' })).toThrow(
      'created_at',
    );
  });
});
