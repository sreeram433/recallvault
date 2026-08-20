-- RecallVault Cloud SQL schema. Never stores Instagram credentials or media binaries.
CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE IF NOT EXISTS users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL UNIQUE,
  display_name text NOT NULL DEFAULT 'You',
  password_hash text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS saved_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  source_url text NOT NULL,
  canonical_url text NOT NULL,
  identity_key text NOT NULL,
  source_type text NOT NULL,
  content_type text NOT NULL DEFAULT 'unknown',
  source_platform text NOT NULL DEFAULT 'web',
  provenance text NOT NULL DEFAULT 'user_pasted',
  capture_source text,
  creator_name text,
  title text,
  user_note text,
  screenshot_object text,
  availability_status text NOT NULL DEFAULT 'saved',
  is_favorite boolean NOT NULL DEFAULT false,
  metadata_json jsonb,
  upload_id text UNIQUE,
  saved_at timestamptz NOT NULL DEFAULT now(),
  open_count integer NOT NULL DEFAULT 0,
  embedding vector(768),
  UNIQUE (user_id, identity_key)
);

CREATE INDEX IF NOT EXISTS saved_items_user_saved_at ON saved_items (user_id, saved_at DESC);
CREATE INDEX IF NOT EXISTS saved_items_identity ON saved_items (user_id, identity_key);
CREATE INDEX IF NOT EXISTS saved_items_note_trgm ON saved_items USING gin (user_note gin_trgm_ops);
CREATE INDEX IF NOT EXISTS saved_items_embedding ON saved_items USING ivfflat (embedding vector_cosine_ops) WITH (lists = 50);

CREATE TABLE IF NOT EXISTS idempotency_keys (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  key text NOT NULL,
  body_hash text NOT NULL,
  status_code integer NOT NULL,
  response_json jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, key)
);

CREATE TABLE IF NOT EXISTS audit_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  action text NOT NULL,
  url_hash text,
  item_id text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS audit_events_user_created ON audit_events (user_id, created_at DESC);
