import type { Comment, Post } from '@/domain/models/post';

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
