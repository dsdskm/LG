BEGIN;

DELETE FROM public.rule
WHERE app_key = 'tms'
  AND rule_type = 'taskflow-command'
  AND rule_key IN (
    'taskflow-list-command',
    'robots-list-command',
    'create-taskflow-command',
    'copy-taskflow-command',
    'delete-taskflow-command',
    'modify-taskflow-command'
  );

INSERT INTO public.rule (
  app_key,
  screen_key,
  rule_type,
  rule_key,
  value_json,
  enabled,
  priority
)
VALUES
  (
    'tms',
    'tms',
    'taskflow-command',
    'taskflow-list-command',
    jsonb_build_object(
      'type', 'taskflow-list',
      'patternRegex', '^/\s*list\s*$',
      'chatAction', 'navigation',
      'chatActionParam', jsonb_build_object(
        'path', 'tms/taskflows',
        'app', 'tms'
      ),
      'replyText', '태스크플로우 목록으로 이동합니다.',
      'notFoundText', '태스크플로우 목록을 열 수 없습니다.',
      'description', 'TMS에서 Task Flow 목록 화면으로 이동한다.'
    ),
    TRUE,
    110
  ),
  (
    'tms',
    'tms',
    'taskflow-command',
    'robots-list-command',
    jsonb_build_object(
      'type', 'robots-list',
      'patternRegex', '^/\s*robots\s*$',
      'chatAction', 'navigation',
      'chatActionParam', jsonb_build_object(
        'path', 'tms/robots',
        'app', 'tms'
      ),
      'replyText', '로봇 목록으로 이동합니다.',
      'notFoundText', '로봇 목록을 열 수 없습니다.',
      'description', 'TMS에서 로봇 목록 화면으로 이동한다.'
    ),
    TRUE,
    110
  ),
  (
    'tms',
    'tms/taskflows',
    'taskflow-command',
    'create-taskflow-command',
    jsonb_build_object(
      'type', 'create-taskflow',
      'patternRegex', '^/\s*create\s*$',
      'replyText', '새 태스크플로우를 생성합니다.',
      'notFoundText', '새 태스크플로우를 생성할 수 없습니다.',
      'description', 'Task Flow 목록에서 새 작업 흐름을 생성한다.'
    ),
    TRUE,
    140
  ),
  (
    'tms',
    'tms/taskflows',
    'taskflow-command',
    'copy-taskflow-command',
    jsonb_build_object(
      'type', 'copy-taskflow',
      'patternRegex', '^/\s*copy\s+(\S+)\s*$',
      'taskFlowId', jsonb_build_array('$1'),
      'replyText', '태스크플로우 $1 를 복제합니다.',
      'notFoundText', '복사할 태스크플로우를 찾지 못했습니다.',
      'description', 'Task Flow 목록에서 지정한 Task Flow를 복제한다.'
    ),
    TRUE,
    140
  ),
  (
    'tms',
    'tms/taskflows',
    'taskflow-command',
    'delete-taskflow-command',
    jsonb_build_object(
      'type', 'delete-taskflow',
      'patternRegex', '^/\s*delete\s+(\S+)\s*$',
      'taskFlowId', jsonb_build_array('$1'),
      'replyText', '태스크플로우 $1 를 삭제합니다.',
      'notFoundText', '삭제할 태스크플로우를 찾지 못했습니다.',
      'description', 'Task Flow 목록에서 지정한 Task Flow를 삭제한다.'
    ),
    TRUE,
    140
  ),
  (
    'tms',
    'tms/taskflows',
    'taskflow-command',
    'modify-taskflow-command',
    jsonb_build_object(
      'type', 'modify-taskflow',
      'patternRegex', '^/\s*modify\s+(\S+)\s*$',
      'taskFlowId', jsonb_build_array('$1'),
      'replyText', '태스크플로우 $1 를 수정합니다.',
      'notFoundText', '수정할 태스크플로우를 찾지 못했습니다.',
      'description', 'Task Flow 목록에서 지정한 Task Flow를 수정 화면으로 연다.'
    ),
    TRUE,
    140
  )
ON CONFLICT (app_key, screen_key, rule_type, rule_key)
DO UPDATE SET
  value_json = EXCLUDED.value_json,
  enabled = EXCLUDED.enabled,
  priority = EXCLUDED.priority,
  updated_at = NOW();

COMMIT;
