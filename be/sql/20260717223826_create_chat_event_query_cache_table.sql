BEGIN;

CREATE TABLE IF NOT EXISTS chat_event_query_cache (
  cache_key text PRIMARY KEY,
  route_key text NOT NULL,
  payload jsonb NOT NULL,
  expires_at timestamptz NOT NULL,
  hit_count integer NOT NULL DEFAULT 0,
  last_hit_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT NOW(),
  updated_at timestamptz NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_chat_event_query_cache_expires_at
  ON chat_event_query_cache (expires_at);

CREATE INDEX IF NOT EXISTS idx_chat_event_query_cache_route_key
  ON chat_event_query_cache (route_key);

COMMIT;
