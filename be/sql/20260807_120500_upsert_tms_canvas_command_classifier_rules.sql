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
    'classifier',
    'tms/taskflows/:taskFlowId/canvas',
    'arrowSequenceEnabled',
    'true'::jsonb,
    true,
    220,
    NOW(),
    NOW()
  ),
  (
    'classifier',
    'tms/taskflows/:taskFlowId/canvas',
    'editSubjectKeywords',
    '["노드", "연결", "태스크", "태스크플로우", "태스크플로", "taskflow", "canvas"]'::jsonb,
    true,
    220,
    NOW(),
    NOW()
  ),
  (
    'classifier',
    'tms/taskflows/:taskFlowId/canvas',
    'editVerbKeywords',
    '["연결", "이어", "추가", "삭제", "수정", "변경", "구성", "만들", "생성"]'::jsonb,
    true,
    220,
    NOW(),
    NOW()
  ),
  (
    'language',
    'tms/taskflows/:taskFlowId/canvas',
    'connectNodeTailTrimPhrases',
    '["로", "으로", "까지", "했는데", "해줘", "해주세요", "연결", "연결해줘"]'::jsonb,
    true,
    220,
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
