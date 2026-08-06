BEGIN;

CREATE TABLE IF NOT EXISTS public.chat_event_rule (
  id BIGSERIAL PRIMARY KEY,
  route_key TEXT NOT NULL,
  rule_key TEXT NOT NULL,
  intent_key TEXT NOT NULL DEFAULT 'ailog-event-query',
  pattern_regex TEXT NOT NULL,
  filters_template JSONB NOT NULL DEFAULT '{}'::jsonb,
  parse_date_range BOOLEAN NOT NULL DEFAULT false,
  parse_period BOOLEAN NOT NULL DEFAULT false,
  parse_severity BOOLEAN NOT NULL DEFAULT false,
  parse_func BOOLEAN NOT NULL DEFAULT false,
  parse_status BOOLEAN NOT NULL DEFAULT false,
  fallback_keyword BOOLEAN NOT NULL DEFAULT false,
  enabled BOOLEAN NOT NULL DEFAULT true,
  priority INTEGER NOT NULL DEFAULT 100,
  confidence NUMERIC(5,4) NOT NULL DEFAULT 0.95,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_chat_event_rule_route_rule UNIQUE (route_key, rule_key)
);

CREATE INDEX IF NOT EXISTS idx_chat_event_rule_route_enabled_priority
  ON public.chat_event_rule (route_key, enabled, priority DESC, id DESC);

COMMIT;
