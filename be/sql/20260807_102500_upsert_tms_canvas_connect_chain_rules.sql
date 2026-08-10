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

CREATE INDEX IF NOT EXISTS ix_chat_taskflow_rule_enabled_priority
  ON public.chat_taskflow_rule (enabled, priority DESC, updated_at DESC);

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
    'connectIntentPhrases',
    '["연결", "연결해", "연결해줘", "이어", "이어줘", "이어서", "잇", "잇어", "붙여", "connect"]'::jsonb,
    true,
    200,
    NOW(),
    NOW()
  ),
  (
    'language',
    'tms/taskflows/:taskFlowId/canvas',
    'connectPairSeparatorPhrases',
    '["->", "→", "에서"]'::jsonb,
    true,
    200,
    NOW(),
    NOW()
  ),
  (
    'language',
    'tms/taskflows/:taskFlowId/canvas',
    'connectChainSeparatorPhrases',
    '["->", "→", "에서"]'::jsonb,
    true,
    200,
    NOW(),
    NOW()
  ),
  (
    'language',
    'tms/taskflows/:taskFlowId/canvas',
    'connectNodeTailTrimPhrases',
    '["로", "으로", "까지"]'::jsonb,
    true,
    200,
    NOW(),
    NOW()
  ),
  (
    'classifier',
    'tms/taskflows/:taskFlowId/canvas',
    'arrowSequenceEnabled',
    'true'::jsonb,
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
