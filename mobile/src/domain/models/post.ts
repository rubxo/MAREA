import { ProfileId, ProfileSummary } from './profile';

export type PostId = string;
export type CommentId = string;

export type PostMedia = Readonly<{
  url: string;
  width: number;
  height: number;
}>;

export type Post = Readonly<{
  id: PostId;
  author: ProfileSummary;
  caption: string;
  media: PostMedia;
  likeCount: number;
  commentCount: number;
  viewerHasLiked: boolean;
  createdAt: string;
}>;

export type Comment = Readonly<{
  id: CommentId;
  postId: PostId;
  authorId: ProfileId;
  author: ProfileSummary;
  body: string;
  parentId: CommentId | null;
  status: 'synced' | 'pending' | 'failed';
  createdAt: string;
}>;
