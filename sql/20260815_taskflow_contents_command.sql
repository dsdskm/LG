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
  'taskflow-command',
  'refresh-taskflow-contents',
  jsonb_build_object(
    'type', 'refresh-contents',
    'aliases', jsonb_build_array('/contents'),
    'replyText', '컨텐츠를 갱신했습니다.',
    'description', '현재 Task Flow에서 사용 중인 컨텐츠를 최신 버전으로 갱신한다.'
  ),
  TRUE,
  100
)
ON CONFLICT (app_key, screen_key, rule_type, rule_key)
DO UPDATE SET
  value_json = EXCLUDED.value_json,
  enabled = EXCLUDED.enabled,
  priority = EXCLUDED.priority,
  updated_at = NOW();

COMMIT;