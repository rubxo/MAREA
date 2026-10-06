import type { Comment, Post } from '@/domain/models/post';

import { overlayPendingComments, overlayPendingPost, reconcileComment, setOptimisticLike } from './reconciliation';
import type { SyncOperation } from '@/domain/models/sync';

const post = {
  id: 'post-1', author: { id: 'user-1', username: 'marea', displayName: 'Marea', avatarUrl: null },
  caption: '', media: { url: 'https://example.com/a.jpg', width: 100, height: 100 },
  likeCount: 4, commentCount: 0, viewerHasLiked: false, createdAt: '2026-10-04T00:00:00Z',
} as Post;

function queued(input: Pick<SyncOperation, 'type' | 'payload' | 'nextAttemptAt'>): SyncOperation {
  return { id: 'op-1', state: 'pending', attempts: 0, createdAt: post.createdAt,
    leaseExpiresAt: null, lastError: null, ...input };
}

describe('reconciliation', () => {
  it('restores pending comments from durable operations without a network response', () => {
    const comment = { id: 'pending', postId: post.id, body: 'Offline', author: post.author } as Comment;
    const operation = queued({ type: 'create_comment', payload: { postId: post.id, comment }, nextAttemptAt: '2026-10-04' });
    expect(overlayPendingComments(post.id, [], [operation])).toEqual([{ ...comment, status: 'pending' }]);
    expect(overlayPendingComments(post.id, [comment], [operation])).toHaveLength(1);
    expect(overlayPendingComments('another-post', [], [operation])).toEqual([]);
  });

  it('shows a rejected comment but does not reapply a permanently rejected like', () => {
    const like = queued({ type: 'set_post_like', payload: { postId: post.id, liked: true }, nextAttemptAt: '9999-12-31' });
    expect(overlayPendingPost(post, [like])).toEqual(post);
    const comment = { id: 'failed', postId: post.id, body: 'Retained text' } as Comment;
    const operation = queued({ type: 'create_comment', payload: { postId: post.id, comment }, nextAttemptAt: '9999-12-31' });
    expect(overlayPendingComments(post.id, [], [operation])[0]?.status).toBe('failed');
  });

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
