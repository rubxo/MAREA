export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type Database = {

  "graphql_public": {
          Tables: {
            [_ in never]: never
          }
          Views: {
            [_ in never]: never
          }
          Functions: {
            "graphql":
{ Args: { "extensions"?: Json,"operationName"?: string,"query"?: string,"variables"?: Json }; Returns: Json
                           }
          }
          Enums: {
            [_ in never]: never
          }
          CompositeTypes: {
            [_ in never]: never
          }
        },"public": {
          Tables: {
            "activities": {
                  Row: {
                    "actor_id": string | null,"created_at": string,"entity_id": string | null,"id": string,"kind": string,"read_at": string | null,"recipient_id": string
                  }
                  Insert: {
                    "actor_id"?: string | null,"created_at"?: string,"entity_id"?: string | null,"id"?: string,"kind": string,"read_at"?: string | null,"recipient_id": string
                  }
                  Update: {
                    "actor_id"?: string | null,"created_at"?: string,"entity_id"?: string | null,"id"?: string,"kind"?: string,"read_at"?: string | null,"recipient_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "activities_actor_id_fkey"
      columns: ["actor_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "activities_recipient_id_fkey"
      columns: ["recipient_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"client_operations": {
                  Row: {
                    "created_at": string,"kind": string,"operation_id": string,"result": NonNullable<Json>,"user_id": string
                  }
                  Insert: {
                    "created_at"?: string,"kind": string,"operation_id": string,"result"?: NonNullable<Json>,"user_id": string
                  }
                  Update: {
                    "created_at"?: string,"kind"?: string,"operation_id"?: string,"result"?: NonNullable<Json>,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "client_operations_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"comments": {
                  Row: {
                    "author_id": string,"body": string,"created_at": string,"id": string,"parent_id": string | null,"post_id": string,"updated_at": string
                  }
                  Insert: {
                    "author_id": string,"body": string,"created_at"?: string,"id": string,"parent_id"?: string | null,"post_id": string,"updated_at"?: string
                  }
                  Update: {
                    "author_id"?: string,"body"?: string,"created_at"?: string,"id"?: string,"parent_id"?: string | null,"post_id"?: string,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "comments_author_id_fkey"
      columns: ["author_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "comments_parent_id_fkey"
      columns: ["parent_id"]
isOneToOne: false
      referencedRelation: "comments"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "comments_post_id_fkey"
      columns: ["post_id"]
isOneToOne: false
      referencedRelation: "posts"
      referencedColumns: ["id"]
    }
                  ]
                },"conversation_members": {
                  Row: {
                    "conversation_id": string,"joined_at": string,"muted_at": string | null,"user_id": string
                  }
                  Insert: {
                    "conversation_id": string,"joined_at"?: string,"muted_at"?: string | null,"user_id": string
                  }
                  Update: {
                    "conversation_id"?: string,"joined_at"?: string,"muted_at"?: string | null,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "conversation_members_conversation_id_fkey"
      columns: ["conversation_id"]
isOneToOne: false
      referencedRelation: "conversations"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "conversation_members_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"conversations": {
                  Row: {
                    "created_at": string,"direct_key": string | null,"id": string,"updated_at": string
                  }
                  Insert: {
                    "created_at"?: string,"direct_key"?: string | null,"id"?: string,"updated_at"?: string
                  }
                  Update: {
                    "created_at"?: string,"direct_key"?: string | null,"id"?: string,"updated_at"?: string
                  }
                  Relationships: [

                  ]
                },"follow_requests": {
                  Row: {
                    "created_at": string,"id": string,"requester_id": string,"responded_at": string | null,"status": string,"target_id": string
                  }
                  Insert: {
                    "created_at"?: string,"id"?: string,"requester_id": string,"responded_at"?: string | null,"status"?: string,"target_id": string
                  }
                  Update: {
                    "created_at"?: string,"id"?: string,"requester_id"?: string,"responded_at"?: string | null,"status"?: string,"target_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "follow_requests_requester_id_fkey"
      columns: ["requester_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "follow_requests_target_id_fkey"
      columns: ["target_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"follows": {
                  Row: {
                    "created_at": string,"follower_id": string,"following_id": string
                  }
                  Insert: {
                    "created_at"?: string,"follower_id": string,"following_id": string
                  }
                  Update: {
                    "created_at"?: string,"follower_id"?: string,"following_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "follows_follower_id_fkey"
      columns: ["follower_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "follows_following_id_fkey"
      columns: ["following_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"message_receipts": {
                  Row: {
                    "delivered_at": string | null,"message_id": string,"read_at": string | null,"user_id": string
                  }
                  Insert: {
                    "delivered_at"?: string | null,"message_id": string,"read_at"?: string | null,"user_id": string
                  }
                  Update: {
                    "delivered_at"?: string | null,"message_id"?: string,"read_at"?: string | null,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "message_receipts_message_id_fkey"
      columns: ["message_id"]
isOneToOne: false
      referencedRelation: "messages"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "message_receipts_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"messages": {
                  Row: {
                    "body": string,"conversation_id": string,"created_at": string,"id": string,"sender_id": string
                  }
                  Insert: {
                    "body": string,"conversation_id": string,"created_at"?: string,"id": string,"sender_id": string
                  }
                  Update: {
                    "body"?: string,"conversation_id"?: string,"created_at"?: string,"id"?: string,"sender_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "messages_conversation_id_fkey"
      columns: ["conversation_id"]
isOneToOne: false
      referencedRelation: "conversations"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "messages_sender_id_fkey"
      columns: ["sender_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"post_likes": {
                  Row: {
                    "created_at": string,"post_id": string,"user_id": string
                  }
                  Insert: {
                    "created_at"?: string,"post_id": string,"user_id": string
                  }
                  Update: {
                    "created_at"?: string,"post_id"?: string,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "post_likes_post_id_fkey"
      columns: ["post_id"]
isOneToOne: false
      referencedRelation: "posts"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "post_likes_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"post_media": {
                  Row: {
                    "created_at": string,"height": number,"id": string,"media_type": string,"position": number,"post_id": string,"storage_path": string,"width": number
                  }
                  Insert: {
                    "created_at"?: string,"height": number,"id"?: string,"media_type"?: string,"position"?: number,"post_id": string,"storage_path": string,"width": number
                  }
                  Update: {
                    "created_at"?: string,"height"?: number,"id"?: string,"media_type"?: string,"position"?: number,"post_id"?: string,"storage_path"?: string,"width"?: number
                  }
                  Relationships: [
                    {
      foreignKeyName: "post_media_post_id_fkey"
      columns: ["post_id"]
isOneToOne: false
      referencedRelation: "posts"
      referencedColumns: ["id"]
    }
                  ]
                },"posts": {
                  Row: {
                    "author_id": string,"caption": string,"comments_enabled": boolean,"created_at": string,"id": string,"location_name": string | null,"updated_at": string
                  }
                  Insert: {
                    "author_id": string,"caption"?: string,"comments_enabled"?: boolean,"created_at"?: string,"id"?: string,"location_name"?: string | null,"updated_at"?: string
                  }
                  Update: {
                    "author_id"?: string,"caption"?: string,"comments_enabled"?: boolean,"created_at"?: string,"id"?: string,"location_name"?: string | null,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "posts_author_id_fkey"
      columns: ["author_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"profiles": {
                  Row: {
                    "avatar_path": string | null,"bio": string,"created_at": string,"display_name": string,"id": string,"is_private": boolean,"updated_at": string,"username": string
                  }
                  Insert: {
                    "avatar_path"?: string | null,"bio"?: string,"created_at"?: string,"display_name": string,"id": string,"is_private"?: boolean,"updated_at"?: string,"username": string
                  }
                  Update: {
                    "avatar_path"?: string | null,"bio"?: string,"created_at"?: string,"display_name"?: string,"id"?: string,"is_private"?: boolean,"updated_at"?: string,"username"?: string
                  }
                  Relationships: [

                  ]
                },"stories": {
                  Row: {
                    "author_id": string,"created_at": string,"expires_at": string,"height": number | null,"id": string,"storage_path": string,"width": number | null
                  }
                  Insert: {
                    "author_id": string,"created_at"?: string,"expires_at"?: string,"height"?: number | null,"id"?: string,"storage_path": string,"width"?: number | null
                  }
                  Update: {
                    "author_id"?: string,"created_at"?: string,"expires_at"?: string,"height"?: number | null,"id"?: string,"storage_path"?: string,"width"?: number | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "stories_author_id_fkey"
      columns: ["author_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"story_views": {
                  Row: {
                    "story_id": string,"viewed_at": string,"viewer_id": string
                  }
                  Insert: {
                    "story_id": string,"viewed_at"?: string,"viewer_id": string
                  }
                  Update: {
                    "story_id"?: string,"viewed_at"?: string,"viewer_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "story_views_story_id_fkey"
      columns: ["story_id"]
isOneToOne: false
      referencedRelation: "stories"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "story_views_viewer_id_fkey"
      columns: ["viewer_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                }
          }
          Views: {
            [_ in never]: never
          }
          Functions: {
            "acknowledge_messages":
{ Args: { "mark_read"?: boolean,"target_conversation_id": string,"through_message_id": string }; Returns: undefined
                           },
"cancel_follow":
{ Args: { "target_user_id": string }; Returns: undefined
                           },
"create_comment_idempotent":
{ Args: { "comment_body": string,"comment_id": string,"operation_id": string,"parent_comment_id"?: string,"target_post_id": string }; Returns: Json
                           },
"get_chat_inbox":
{ Args: Record<PropertyKey, never>; Returns: {
              "conversation_id": string,"last_body": string,"last_created_at": string,"last_message_id": string,"last_sender_id": string,"peer_avatar_path": string,"peer_display_name": string,"peer_id": string,"peer_is_private": boolean,"peer_username": string,"unread_count": number,"updated_at": string
            }[]
                           },
"get_or_create_direct_conversation":
{ Args: { "target_username": string }; Returns: string
                           },
"get_post":
{ Args: { "target_id": string }; Returns: Json
                           },
"list_posts":
{ Args: { "author_filter"?: string,"before_id"?: string,"before_time"?: string,"feed_only"?: boolean,"page_size"?: number,"search_text"?: string }; Returns: Json
                           },
"publish_post":
{ Args: { "caption_text": string,"media_height": number,"media_path": string,"media_width": number,"post_id": string }; Returns: string
                           },
"request_follow":
{ Args: { "operation_id": string,"target_user_id": string }; Returns: Json
                           },
"respond_follow_request":
{ Args: { "decision": string,"operation_id": string,"target_request_id": string }; Returns: Json
                           },
"send_message_idempotent":
{ Args: { "message_body": string,"message_id": string,"operation_id": string,"target_conversation_id": string }; Returns: Json
                           },
"set_post_like":
{ Args: { "liked": boolean,"operation_id": string,"target_post_id": string }; Returns: Json
                           }
          }
          Enums: {
            [_ in never]: never
          }
          CompositeTypes: {
            [_ in never]: never
          }
        }
}

type DatabaseWithoutInternals = Omit<Database, '__InternalSupabase'>

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
  ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
      Row: infer R
    }
    ? R
    : never
  : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
  ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
      Insert: infer I
    }
    ? I
    : never
  : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
  ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
      Update: infer U
    }
    ? U
    : never
  : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
  ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
  : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never
> = PublicCompositeTypeNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
  ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
  : never

export const Constants = {
  "graphql_public": {
          Enums: {

          }
        },"public": {
          Enums: {

          }
        }
} as const

export type ProfileRecord = Database['public']['Tables']['profiles']['Row'];
