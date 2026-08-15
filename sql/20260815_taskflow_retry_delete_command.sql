BEGIN;

DELETE FROM public.rule
WHERE app_key = 'tms'
  AND screen_key = 'tms/taskflows/:taskFlowId/canvas'
  AND rule_type = 'taskflow-command'
  AND rule_key = 'delete-retry-node';

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
  'delete-node-by-name',
  jsonb_build_object(
    'type', 'remove-nodes-by-name',
    'patternRegex', '^!\s*(\S(?:.*\S)?)\s*$',
    'names', jsonb_build_array('$1'),
    'replyText', '$1 노드를 삭제했습니다.',
    'notFoundText', '삭제할 $1 노드가 없습니다.',
    'description', '! 뒤에 입력한 이름과 일치하는 노드를 현재 Task Flow에서 삭제한다.'
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