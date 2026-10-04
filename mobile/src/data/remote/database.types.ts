export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

type ProfileRow = {
  id: string;
  username: string;
  display_name: string;
  bio: string;
  avatar_path: string | null;
  is_private: boolean;
  created_at: string;
  updated_at: string;
};

type FollowRow = {
  follower_id: string;
  following_id: string;
  created_at: string;
};

type FollowRequestRow = {
  id: string;
  requester_id: string;
  target_id: string;
  status: string;
  created_at: string;
  responded_at: string | null;
};

type PostRow = {
  id: string;
  author_id: string;
  caption: string;
  location_name: string | null;
  comments_enabled: boolean;
  created_at: string;
  updated_at: string;
};

type Table<Row, Insert, Update> = {
  Row: Row;
  Insert: Insert;
  Update: Update;
  Relationships: [];
};

export type Database = {
  public: {
    Tables: {
      profiles: Table<
        ProfileRow,
        Pick<ProfileRow, 'id' | 'username' | 'display_name'> & Partial<ProfileRow>,
        Partial<ProfileRow>
      >;
      follows: Table<FollowRow, Pick<FollowRow, 'follower_id' | 'following_id'>, never>;
      follow_requests: Table<
        FollowRequestRow,
        Pick<FollowRequestRow, 'requester_id' | 'target_id'> & Partial<FollowRequestRow>,
        Partial<FollowRequestRow>
      >;
      posts: Table<
        PostRow,
        Pick<PostRow, 'author_id'> & Partial<PostRow>,
        Partial<PostRow>
      >;
    };
    Views: { [_ in never]: never };
    Functions: {
      request_follow: {
        Args: { operation_id: string; target_user_id: string };
        Returns: Json;
      };
      respond_follow_request: {
        Args: { decision: string; operation_id: string; target_request_id: string };
        Returns: Json;
      };
      set_post_like: {
        Args: { liked: boolean; operation_id: string; target_post_id: string };
        Returns: Json;
      };
      create_comment_idempotent: {
        Args: {
          comment_body: string;
          comment_id: string;
          operation_id: string;
          parent_comment_id?: string;
          target_post_id: string;
        };
        Returns: Json;
      };
      send_message_idempotent: {
        Args: {
          message_body: string;
          message_id: string;
          operation_id: string;
          target_conversation_id: string;
        };
        Returns: Json;
      };
    };
    Enums: { [_ in never]: never };
    CompositeTypes: { [_ in never]: never };
  };
};

export type ProfileRecord = Database['public']['Tables']['profiles']['Row'];

