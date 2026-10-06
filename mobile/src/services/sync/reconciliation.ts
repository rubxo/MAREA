import type { Comment, Post } from '@/domain/models/post';
import type { SyncOperation } from '@/domain/models/sync';

export function overlayPendingPost(post: Post, operations: readonly SyncOperation[]): Post {
  return operations.reduce((current, operation) =>
    operation.type === 'set_post_like' && operation.payload.postId === post.id && !operation.nextAttemptAt.startsWith('9999')
      ? setOptimisticLike(current, operation.payload.liked === true) : current, post);
}

export function overlayPendingComments(postId: string, comments: readonly Comment[], operations: readonly SyncOperation[]): Comment[] {
  const result = [...comments];
  for (const operation of operations) {
    if (operation.type !== 'create_comment' || operation.payload.postId !== postId || !operation.payload.comment) continue;
    const comment = operation.payload.comment as Comment;
    if (!result.some(existing => existing.id === comment.id)) result.push({
      ...comment, status: operation.nextAttemptAt.startsWith('9999') ? 'failed' : 'pending',
    });
  }
  return result;
}

export function setOptimisticLike(post: Post, liked: boolean): Post {
  if (post.viewerHasLiked === liked) return post;
  return {
    ...post,
    viewerHasLiked: liked,
    likeCount: Math.max(0, post.likeCount + (liked ? 1 : -1)),
  };
}

export function reconcileComment(comments: readonly Comment[], serverComment: Comment): Comment[] {
  const index = comments.findIndex((comment) => comment.id === serverComment.id);
  if (index === -1) return [...comments, serverComment];
  return comments.map((comment, commentIndex) => commentIndex === index ? serverComment : comment);
}
