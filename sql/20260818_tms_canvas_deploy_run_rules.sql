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
VALUES
  (
    'tms',
    'tms/taskflows',
    'taskflow-command',
    'taskflows-deploy-command',
    jsonb_build_object(
      'patternRegex', $regex$^/\s*deploy\s+(?:(\S+)\s+(\S+)|(\S+))\s*$regex$,
      'type', 'deploy-taskflow',
      'robotId', jsonb_build_array('$1', '$3'),
      'taskFlowId', jsonb_build_array('$2', '$3'),
      'replyText', '로봇 $1 에서 태스크플로우 $2 배포를 요청합니다.',
      'notFoundText', '배포할 로봇 또는 태스크플로우 정보를 찾지 못했습니다.',
      'description', 'TaskFlow 목록 화면에서 로봇 ID 또는 TaskFlow ID를 하나만 받아도 배포 명령을 생성한다.'
    ),
    TRUE,
    140
  ),
  (
    'tms',
    'tms/taskflows',
    'taskflow-command',
    'taskflows-run-command',
    jsonb_build_object(
      'patternRegex', $regex$^/\s*run\s+(?:(\S+)\s+(\S+)|(\S+))\s*$regex$,
      'type', 'run-taskflow',
      'robotId', jsonb_build_array('$1', '$3'),
      'taskFlowId', jsonb_build_array('$2', '$3'),
      'replyText', '로봇 $1 에서 태스크플로우 $2 실행을 요청합니다.',
      'notFoundText', '실행할 로봇 또는 태스크플로우 정보를 찾지 못했습니다.',
      'description', 'TaskFlow 목록 화면에서 로봇 ID 또는 TaskFlow ID를 하나만 받아도 실행 명령을 생성한다.'
    ),
    TRUE,
    140
  ),
  (
    'tms',
    'tms/taskflows',
    'taskflow-command',
    'taskflows-pause-command',
    jsonb_build_object(
      'patternRegex', $regex$^/\s*pause\s+(?:(\S+)\s+(\S+)|(\S+))\s*$regex$,
      'type', 'pause-taskflow',
      'robotId', jsonb_build_array('$1', '$3'),
      'taskFlowId', jsonb_build_array('$2', '$3'),
      'replyText', '로봇 $1 에서 태스크플로우 $2 일시정지를 요청합니다.',
      'notFoundText', '일시정지할 로봇 또는 태스크플로우 정보를 찾지 못했습니다.',
      'description', 'TaskFlow 목록 화면에서 로봇 ID 또는 TaskFlow ID를 하나만 받아도 일시정지 명령을 생성한다.'
    ),
    TRUE,
    140
  ),
  (
    'tms',
    'tms/taskflows',
    'taskflow-command',
    'taskflows-resume-command',
    jsonb_build_object(
      'patternRegex', $regex$^/\s*resume\s+(?:(\S+)\s+(\S+)|(\S+))\s*$regex$,
      'type', 'resume-taskflow',
      'robotId', jsonb_build_array('$1', '$3'),
      'taskFlowId', jsonb_build_array('$2', '$3'),
      'replyText', '로봇 $1 에서 태스크플로우 $2 재개를 요청합니다.',
      'notFoundText', '재개할 로봇 또는 태스크플로우 정보를 찾지 못했습니다.',
      'description', 'TaskFlow 목록 화면에서 로봇 ID 또는 TaskFlow ID를 하나만 받아도 재개 명령을 생성한다.'
    ),
    TRUE,
    140
  ),
  (
    'tms',
    'tms/taskflows',
    'taskflow-command',
    'taskflows-stop-command',
    jsonb_build_object(
      'patternRegex', $regex$^/\s*stop\s+(?:(\S+)\s+(\S+)|(\S+))\s*$regex$,
      'type', 'stop-taskflow',
      'robotId', jsonb_build_array('$1', '$3'),
      'taskFlowId', jsonb_build_array('$2', '$3'),
      'replyText', '로봇 $1 에서 태스크플로우 $2 정지를 요청합니다.',
      'notFoundText', '정지할 로봇 또는 태스크플로우 정보를 찾지 못했습니다.',
      'description', 'TaskFlow 목록 화면에서 로봇 ID 또는 TaskFlow ID를 하나만 받아도 정지 명령을 생성한다.'
    ),
    TRUE,
    140
  ),
  (
    'tms',
    'tms/taskflows/:taskFlowId/detail',
    'taskflow-command',
    'taskflow-detail-deploy-command',
    jsonb_build_object(
      'patternRegex', $regex$^/\s*deploy\s+(?:(\S+)\s+(\S+)|(\S+))\s*$regex$,
      'type', 'deploy-taskflow',
      'robotId', jsonb_build_array('$1', '$3'),
      'taskFlowId', jsonb_build_array('$2', '$3'),
      'replyText', '로봇 $1 에서 태스크플로우 $2 배포를 요청합니다.',
      'notFoundText', '배포할 로봇 또는 태스크플로우 정보를 찾지 못했습니다.',
      'description', 'TaskFlow 상세 화면에서 로봇 ID 또는 TaskFlow ID를 하나만 받아도 배포 명령을 생성한다.'
    ),
    TRUE,
    200
  ),
  (
    'tms',
    'tms/taskflows/:taskFlowId/detail',
    'taskflow-command',
    'taskflow-detail-run-command',
    jsonb_build_object(
      'patternRegex', $regex$^/\s*run\s+(?:(\S+)\s+(\S+)|(\S+))\s*$regex$,
      'type', 'run-taskflow',
      'robotId', jsonb_build_array('$1', '$3'),
      'taskFlowId', jsonb_build_array('$2', '$3'),
      'replyText', '로봇 $1 에서 태스크플로우 $2 실행을 요청합니다.',
      'notFoundText', '실행할 로봇 또는 태스크플로우 정보를 찾지 못했습니다.',
      'description', 'TaskFlow 상세 화면에서 로봇 ID 또는 TaskFlow ID를 하나만 받아도 실행 명령을 생성한다.'
    ),
    TRUE,
    200
  ),
  (
    'tms',
    'tms/taskflows/:taskFlowId/detail',
    'taskflow-command',
    'taskflow-detail-pause-command',
    jsonb_build_object(
      'patternRegex', $regex$^/\s*pause\s+(?:(\S+)\s+(\S+)|(\S+))\s*$regex$,
      'type', 'pause-taskflow',
      'robotId', jsonb_build_array('$1', '$3'),
      'taskFlowId', jsonb_build_array('$2', '$3'),
      'replyText', '로봇 $1 에서 태스크플로우 $2 일시정지를 요청합니다.',
      'notFoundText', '일시정지할 로봇 또는 태스크플로우 정보를 찾지 못했습니다.',
      'description', 'TaskFlow 상세 화면에서 로봇 ID 또는 TaskFlow ID를 하나만 받아도 일시정지 명령을 생성한다.'
    ),
    TRUE,
    200
  ),
  (
    'tms',
    'tms/taskflows/:taskFlowId/detail',
    'taskflow-command',
    'taskflow-detail-resume-command',
    jsonb_build_object(
      'patternRegex', $regex$^/\s*resume\s+(?:(\S+)\s+(\S+)|(\S+))\s*$regex$,
      'type', 'resume-taskflow',
      'robotId', jsonb_build_array('$1', '$3'),
      'taskFlowId', jsonb_build_array('$2', '$3'),
      'replyText', '로봇 $1 에서 태스크플로우 $2 재개를 요청합니다.',
      'notFoundText', '재개할 로봇 또는 태스크플로우 정보를 찾지 못했습니다.',
      'description', 'TaskFlow 상세 화면에서 로봇 ID 또는 TaskFlow ID를 하나만 받아도 재개 명령을 생성한다.'
    ),
    TRUE,
    200
  ),
  (
    'tms',
    'tms/taskflows/:taskFlowId/detail',
    'taskflow-command',
    'taskflow-detail-stop-command',
    jsonb_build_object(
      'patternRegex', $regex$^/\s*stop\s+(?:(\S+)\s+(\S+)|(\S+))\s*$regex$,
      'type', 'stop-taskflow',
      'robotId', jsonb_build_array('$1', '$3'),
      'taskFlowId', jsonb_build_array('$2', '$3'),
      'replyText', '로봇 $1 에서 태스크플로우 $2 정지를 요청합니다.',
      'notFoundText', '정지할 로봇 또는 태스크플로우 정보를 찾지 못했습니다.',
      'description', 'TaskFlow 상세 화면에서 로봇 ID 또는 TaskFlow ID를 하나만 받아도 정지 명령을 생성한다.'
    ),
    TRUE,
    200
  ),
  (
    'tms',
    'tms/robots',
    'taskflow-command',
    'robots-deploy-command',
    jsonb_build_object(
      'patternRegex', $regex$^/\s*deploy\s+(?:(\S+)\s+(\S+)|(\S+))\s*$regex$,
      'type', 'deploy-taskflow',
      'robotId', jsonb_build_array('$1', '$3'),
      'taskFlowId', jsonb_build_array('$2', '$3'),
      'replyText', '로봇 $1 에서 태스크플로우 $2 배포를 요청합니다.',
      'notFoundText', '배포할 로봇 또는 태스크플로우 정보를 찾지 못했습니다.',
      'description', '로봇 목록 화면에서도 로봇 ID 또는 TaskFlow ID를 각각 하나만 받아도 배포 명령을 생성한다.'
    ),
    TRUE,
    150
  ),
  (
    'tms',
    'tms/robots',
    'taskflow-command',
    'robots-run-command',
    jsonb_build_object(
      'patternRegex', $regex$^/\s*run\s+(?:(\S+)\s+(\S+)|(\S+))\s*$regex$,
      'type', 'run-taskflow',
      'robotId', jsonb_build_array('$1', '$3'),
      'taskFlowId', jsonb_build_array('$2', '$3'),
      'replyText', '로봇 $1 에서 태스크플로우 $2 실행을 요청합니다.',
      'notFoundText', '실행할 로봇 또는 태스크플로우 정보를 찾지 못했습니다.',
      'description', '로봇 목록 화면에서도 로봇 ID 또는 TaskFlow ID를 각각 하나만 받아도 실행 명령을 생성한다.'
    ),
    TRUE,
    150
  ),
  (
    'tms',
    'tms/robots',
    'taskflow-command',
    'robots-pause-command',
    jsonb_build_object(
      'patternRegex', $regex$^/\s*pause\s+(?:(\S+)\s+(\S+)|(\S+))\s*$regex$,
      'type', 'pause-taskflow',
      'robotId', jsonb_build_array('$1', '$3'),
      'taskFlowId', jsonb_build_array('$2', '$3'),
      'replyText', '로봇 $1 에서 태스크플로우 $2 일시정지를 요청합니다.',
      'notFoundText', '일시정지할 로봇 또는 태스크플로우 정보를 찾지 못했습니다.',
      'description', '로봇 목록 화면에서도 로봇 ID 또는 TaskFlow ID를 각각 하나만 받아도 일시정지 명령을 생성한다.'
    ),
    TRUE,
    150
  ),
  (
    'tms',
    'tms/robots',
    'taskflow-command',
    'robots-resume-command',
    jsonb_build_object(
      'patternRegex', $regex$^/\s*resume\s+(?:(\S+)\s+(\S+)|(\S+))\s*$regex$,
      'type', 'resume-taskflow',
      'robotId', jsonb_build_array('$1', '$3'),
      'taskFlowId', jsonb_build_array('$2', '$3'),
      'replyText', '로봇 $1 에서 태스크플로우 $2 재개를 요청합니다.',
      'notFoundText', '재개할 로봇 또는 태스크플로우 정보를 찾지 못했습니다.',
      'description', '로봇 목록 화면에서도 로봇 ID 또는 TaskFlow ID를 각각 하나만 받아도 재개 명령을 생성한다.'
    ),
    TRUE,
    150
  ),
  (
    'tms',
    'tms/robots',
    'taskflow-command',
    'robots-stop-command',
    jsonb_build_object(
      'patternRegex', $regex$^/\s*stop\s+(?:(\S+)\s+(\S+)|(\S+))\s*$regex$,
      'type', 'stop-taskflow',
      'robotId', jsonb_build_array('$1', '$3'),
      'taskFlowId', jsonb_build_array('$2', '$3'),
      'replyText', '로봇 $1 에서 태스크플로우 $2 정지를 요청합니다.',
      'notFoundText', '정지할 로봇 또는 태스크플로우 정보를 찾지 못했습니다.',
      'description', '로봇 목록 화면에서도 로봇 ID 또는 TaskFlow ID를 각각 하나만 받아도 정지 명령을 생성한다.'
    ),
    TRUE,
    150
  ),
  (
    'tms',
    'tms/robots/:robotId/detail',
    'taskflow-command',
    'robot-detail-deploy-command',
    jsonb_build_object(
      'patternRegex', $regex$^/\s*deploy\s+(?:(\S+)\s+(\S+)|(\S+))\s*$regex$,
      'type', 'deploy-taskflow',
      'robotId', jsonb_build_array('$1', '$3'),
      'taskFlowId', jsonb_build_array('$2', '$3'),
      'replyText', '로봇 $1 에서 태스크플로우 $2 배포를 요청합니다.',
      'notFoundText', '배포할 로봇 또는 태스크플로우 정보를 찾지 못했습니다.',
      'description', '로봇 상세 화면에서도 로봇 ID 또는 TaskFlow ID를 하나만 받아도 배포 명령을 생성한다.'
    ),
    TRUE,
    220
  ),
  (
    'tms',
    'tms/robots/:robotId/detail',
    'taskflow-command',
    'robot-detail-run-command',
    jsonb_build_object(
      'patternRegex', $regex$^/\s*run\s+(?:(\S+)\s+(\S+)|(\S+))\s*$regex$,
      'type', 'run-taskflow',
      'robotId', jsonb_build_array('$1', '$3'),
      'taskFlowId', jsonb_build_array('$2', '$3'),
      'replyText', '로봇 $1 에서 태스크플로우 $2 실행을 요청합니다.',
      'notFoundText', '실행할 로봇 또는 태스크플로우 정보를 찾지 못했습니다.',
      'description', '로봇 상세 화면에서도 로봇 ID 또는 TaskFlow ID를 하나만 받아도 실행 명령을 생성한다.'
    ),
    TRUE,
    220
  ),
  (
    'tms',
    'tms/robots/:robotId/detail',
    'taskflow-command',
    'robot-detail-pause-command',
    jsonb_build_object(
      'patternRegex', $regex$^/\s*pause\s+(?:(\S+)\s+(\S+)|(\S+))\s*$regex$,
      'type', 'pause-taskflow',
      'robotId', jsonb_build_array('$1', '$3'),
      'taskFlowId', jsonb_build_array('$2', '$3'),
      'replyText', '로봇 $1 에서 태스크플로우 $2 일시정지를 요청합니다.',
      'notFoundText', '일시정지할 로봇 또는 태스크플로우 정보를 찾지 못했습니다.',
      'description', '로봇 상세 화면에서도 로봇 ID 또는 TaskFlow ID를 하나만 받아도 일시정지 명령을 생성한다.'
    ),
    TRUE,
    220
  ),
  (
    'tms',
    'tms/robots/:robotId/detail',
    'taskflow-command',
    'robot-detail-resume-command',
    jsonb_build_object(
      'patternRegex', $regex$^/\s*resume\s+(?:(\S+)\s+(\S+)|(\S+))\s*$regex$,
      'type', 'resume-taskflow',
      'robotId', jsonb_build_array('$1', '$3'),
      'taskFlowId', jsonb_build_array('$2', '$3'),
      'replyText', '로봇 $1 에서 태스크플로우 $2 재개를 요청합니다.',
      'notFoundText', '재개할 로봇 또는 태스크플로우 정보를 찾지 못했습니다.',
      'description', '로봇 상세 화면에서도 로봇 ID 또는 TaskFlow ID를 하나만 받아도 재개 명령을 생성한다.'
    ),
    TRUE,
    220
  ),
  (
    'tms',
    'tms/robots/:robotId/detail',
    'taskflow-command',
    'robot-detail-stop-command',
    jsonb_build_object(
      'patternRegex', $regex$^/\s*stop\s+(?:(\S+)\s+(\S+)|(\S+))\s*$regex$,
      'type', 'stop-taskflow',
      'robotId', jsonb_build_array('$1', '$3'),
      'taskFlowId', jsonb_build_array('$2', '$3'),
      'replyText', '로봇 $1 에서 태스크플로우 $2 정지를 요청합니다.',
      'notFoundText', '정지할 로봇 또는 태스크플로우 정보를 찾지 못했습니다.',
      'description', '로봇 상세 화면에서도 로봇 ID 또는 TaskFlow ID를 하나만 받아도 정지 명령을 생성한다.'
    ),
    TRUE,
    220
  )
ON CONFLICT (app_key, screen_key, rule_type, rule_key)
DO UPDATE SET
  value_json = EXCLUDED.value_json,
  enabled = EXCLUDED.enabled,
  priority = EXCLUDED.priority,
  updated_at = NOW();

COMMIT;
