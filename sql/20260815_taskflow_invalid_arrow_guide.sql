BEGIN;

INSERT INTO public.rule (
  app_key,
  screen_key,
  rule_type,
  rule_key,
  value_json,
  enabled,
  priority
)
VALUES (
  'tms',
  'tms/taskflows/:taskFlowId/canvas',
  'taskflow-graph-guide',
  'invalid-arrow-format-guide',
  jsonb_build_object(
    'patternRegex', $regex$^(?![\s\S]*(?:->|=>|→|⇒))(?=[\s\S]{1,200}$)\s*\S+\s*[-.>]{1,4}\s*\S+\s*$$regex$,
    'description', '지원하지 않는 화살표 구분자를 사용한 요청에 화면별 가이드 형식을 안내한다.'
  ),
  TRUE,
  400
)
ON CONFLICT (app_key, screen_key, rule_type, rule_key)
DO UPDATE SET
  value_json = EXCLUDED.value_json,
  enabled = EXCLUDED.enabled,
  priority = EXCLUDED.priority,
  updated_at = NOW();

COMMIT;