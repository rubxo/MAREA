export const INITIAL_SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS profiles (
  id TEXT PRIMARY KEY NOT NULL,
  username TEXT NOT NULL UNIQUE,
  display_name TEXT NOT NULL,
  avatar_url TEXT,
  bio TEXT NOT NULL DEFAULT '',
  is_private INTEGER NOT NULL DEFAULT 0 CHECK (is_private IN (0, 1)),
  follower_count INTEGER NOT NULL DEFAULT 0 CHECK (follower_count >= 0),
  following_count INTEGER NOT NULL DEFAULT 0 CHECK (following_count >= 0),
  post_count INTEGER NOT NULL DEFAULT 0 CHECK (post_count >= 0),
  relationship TEXT NOT NULL DEFAULT 'none',
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS posts (
  id TEXT PRIMARY KEY NOT NULL,
  author_id TEXT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  caption TEXT NOT NULL DEFAULT '',
  media_url TEXT NOT NULL,
  media_width INTEGER NOT NULL CHECK (media_width > 0),
  media_height INTEGER NOT NULL CHECK (media_height > 0),
  like_count INTEGER NOT NULL DEFAULT 0 CHECK (like_count >= 0),
  comment_count INTEGER NOT NULL DEFAULT 0 CHECK (comment_count >= 0),
  viewer_has_liked INTEGER NOT NULL DEFAULT 0 CHECK (viewer_has_liked IN (0, 1)),
  pending_state TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS comments (
  id TEXT PRIMARY KEY NOT NULL,
  post_id TEXT NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  author_id TEXT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  parent_id TEXT REFERENCES comments(id) ON DELETE CASCADE,
  body TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'synced',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS stories (
  id TEXT PRIMARY KEY NOT NULL,
  author_id TEXT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  media_url TEXT NOT NULL,
  created_at TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  viewed_at TEXT
);

CREATE TABLE IF NOT EXISTS conversations (
  id TEXT PRIMARY KEY NOT NULL,
  last_message_id TEXT,
  unread_count INTEGER NOT NULL DEFAULT 0 CHECK (unread_count >= 0),
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS conversation_members (
  conversation_id TEXT NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  profile_id TEXT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  PRIMARY KEY (conversation_id, profile_id)
);

CREATE TABLE IF NOT EXISTS messages (
  id TEXT PRIMARY KEY NOT NULL,
  conversation_id TEXT NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  sender_id TEXT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  body TEXT NOT NULL,
  status TEXT NOT NULL,
  created_at TEXT NOT NULL,
  delivered_at TEXT,
  read_at TEXT
);

CREATE TABLE IF NOT EXISTS sync_operations (
  id TEXT PRIMARY KEY NOT NULL,
  type TEXT NOT NULL,
  payload TEXT NOT NULL,
  state TEXT NOT NULL DEFAULT 'pending',
  attempts INTEGER NOT NULL DEFAULT 0 CHECK (attempts >= 0),
  created_at TEXT NOT NULL,
  next_attempt_at TEXT NOT NULL,
  lease_expires_at TEXT,
  last_error TEXT
);

CREATE TABLE IF NOT EXISTS image_cache (
  cache_key TEXT PRIMARY KEY NOT NULL,
  remote_url TEXT NOT NULL UNIQUE,
  local_uri TEXT NOT NULL,
  byte_size INTEGER NOT NULL CHECK (byte_size >= 0),
  last_accessed_at INTEGER NOT NULL,
  pinned INTEGER NOT NULL DEFAULT 0 CHECK (pinned IN (0, 1))
);

CREATE INDEX IF NOT EXISTS posts_created_idx ON posts(created_at DESC, id DESC);
CREATE INDEX IF NOT EXISTS posts_author_idx ON posts(author_id, created_at DESC);
CREATE INDEX IF NOT EXISTS comments_post_idx ON comments(post_id, created_at ASC);
CREATE INDEX IF NOT EXISTS stories_expiry_idx ON stories(expires_at, author_id);
CREATE INDEX IF NOT EXISTS messages_conversation_idx ON messages(conversation_id, created_at DESC, id DESC);
CREATE INDEX IF NOT EXISTS conversations_updated_idx ON conversations(updated_at DESC);
CREATE INDEX IF NOT EXISTS sync_pending_idx ON sync_operations(state, next_attempt_at, created_at);
CREATE INDEX IF NOT EXISTS image_cache_lru_idx ON image_cache(pinned, last_accessed_at ASC);
`;
