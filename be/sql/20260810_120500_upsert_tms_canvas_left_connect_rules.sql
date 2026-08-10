BEGIN;

CREATE TABLE IF NOT EXISTS public.chat_taskflow_rule (
  id BIGSERIAL PRIMARY KEY,
  rule_type TEXT NOT NULL,
  scope_key TEXT NOT NULL,
  rule_key TEXT NOT NULL,
  value_json JSONB NOT NULL,
  enabled BOOLEAN NOT NULL DEFAULT true,
  priority INTEGER NOT NULL DEFAULT 100,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT chat_taskflow_rule_rule_type_check
    CHECK (rule_type IN ('language', 'classifier', 'orchestrator'))
);

CREATE UNIQUE INDEX IF NOT EXISTS ux_chat_taskflow_rule_scope
  ON public.chat_taskflow_rule (rule_type, scope_key, rule_key);

INSERT INTO public.chat_taskflow_rule (
  rule_type,
  scope_key,
  rule_key,
  value_json,
  enabled,
  priority,
  created_at,
  updated_at
)
VALUES
  (
    'language',
    'tms/taskflows/:taskFlowId/canvas',
    'connectPairSeparatorPhrases',
    '["->", "→", "와", "에서"]'::jsonb,
    true,
    200,
    NOW(),
    NOW()
  ),
  (
    'language',
    'tms/taskflows/:taskFlowId/canvas',
    'connectLeftPairSeparatorPhrases',
    '["=>", "⇒"]'::jsonb,
    true,
    200,
    NOW(),
    NOW()
  )
ON CONFLICT (rule_type, scope_key, rule_key)
DO UPDATE SET
  value_json = EXCLUDED.value_json,
  enabled = true,
  priority = EXCLUDED.priority,
  updated_at = NOW();

COMMIT;
