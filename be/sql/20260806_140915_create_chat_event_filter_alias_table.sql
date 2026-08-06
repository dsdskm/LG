BEGIN;

CREATE TABLE IF NOT EXISTS public.chat_event_filter_alias (
  id BIGSERIAL PRIMARY KEY,
  route_key TEXT NOT NULL,
  alias_type TEXT NOT NULL,
  source_pattern TEXT NOT NULL,
  normalized_value TEXT NOT NULL,
  match_mode TEXT NOT NULL DEFAULT 'contains',
  enabled BOOLEAN NOT NULL DEFAULT true,
  priority INTEGER NOT NULL DEFAULT 100,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT ck_chat_event_filter_alias_type CHECK (alias_type IN ('period', 'severity', 'status')),
  CONSTRAINT ck_chat_event_filter_alias_mode CHECK (match_mode IN ('exact', 'contains', 'regex'))
);

CREATE INDEX IF NOT EXISTS idx_chat_event_filter_alias_route_type
  ON public.chat_event_filter_alias (route_key, alias_type, enabled, priority DESC, id DESC);

COMMIT;
