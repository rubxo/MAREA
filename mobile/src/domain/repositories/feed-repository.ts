import { Comment, Post, PostId } from '../models';

export type Page<T> = Readonly<{ items: readonly T[]; nextCursor: string | null }>;

export interface FeedRepository {
  getFeed(cursor: string | null, limit: number): Promise<Page<Post>>;
  getPost(id: PostId): Promise<Post | null>;
  getComments(postId: PostId, cursor: string | null, limit: number): Promise<Page<Comment>>;
  setLike(postId: PostId, liked: boolean): Promise<void>;
  addComment(comment: Comment): Promise<void>;
}
