BEGIN;

CREATE TABLE IF NOT EXISTS chat_query_phrase_map (
  id bigserial PRIMARY KEY,
  route_key text NOT NULL,
  phrase text NOT NULL,
  phrase_norm text NOT NULL,
  intent_key text NOT NULL,
  filters_template jsonb NOT NULL DEFAULT '{}'::jsonb,
  enabled boolean NOT NULL DEFAULT true,
  priority integer NOT NULL DEFAULT 100,
  created_at timestamptz NOT NULL DEFAULT NOW(),
  updated_at timestamptz NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_chat_query_phrase_map_route_phrase_norm
  ON chat_query_phrase_map (route_key, phrase_norm);

CREATE INDEX IF NOT EXISTS idx_chat_query_phrase_map_route_enabled_priority
  ON chat_query_phrase_map (route_key, enabled, priority);

COMMIT;
