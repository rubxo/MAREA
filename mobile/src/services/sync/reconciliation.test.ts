import type { Comment, Post } from '@/domain/models/post';

import { reconcileComment, setOptimisticLike } from './reconciliation';

const post = {
  id: 'post-1', author: { id: 'user-1', username: 'marea', displayName: 'Marea', avatarUrl: null },
  caption: '', media: { url: 'https://example.com/a.jpg', width: 100, height: 100 },
  likeCount: 4, commentCount: 0, viewerHasLiked: false, createdAt: '2026-10-04T00:00:00Z',
} as Post;

describe('reconciliation', () => {
  it('uses set semantics for optimistic likes', () => {
    const liked = setOptimisticLike(post, true);
    expect(liked).toMatchObject({ viewerHasLiked: true, likeCount: 5 });
    expect(setOptimisticLike(liked, true).likeCount).toBe(5);
    expect(setOptimisticLike(liked, false).likeCount).toBe(4);
  });

  it('replaces an optimistic comment by client id instead of duplicating it', () => {
    const pending = { id: 'client-1', postId: 'post-1', authorId: 'user-1', author: post.author,
      body: 'hola', parentId: null, status: 'pending', createdAt: post.createdAt } as Comment;
    const server = { ...pending, status: 'synced' } as Comment;
    expect(reconcileComment([pending], server)).toEqual([server]);
  });
});
