WITH input(app_key, key, route_key, screen_name, depth, sort_order, enabled) AS (
  VALUES
    ('robot', 'robot/dashboard', 'robot', '대시보드', 2, 10, TRUE),
    ('robot', 'robot/management', 'robot', '로봇 목록', 2, 20, TRUE),
    ('robot', 'robot/ailog', 'robot', 'AI 로그 분석', 2, 30, TRUE),
    ('robot', 'robot/ailog/event', 'robot/ailog', '이벤트', 3, 40, TRUE),
    ('robot', 'robot/ailog/stats', 'robot/ailog', '통계', 3, 50, TRUE),
    ('robot', 'robot/ailog/func', 'robot/ailog', '기능 관리', 3, 60, TRUE),
    ('robot', 'robot/ailog/action', 'robot/ailog', '액션 관리', 3, 70, TRUE),
    ('robot', 'robot/ailog/prompt', 'robot/ailog', '프롬프트 관리', 3, 80, TRUE),
    ('robot', 'robot/ailog/assignees', 'robot/ailog', '담당자 관리', 3, 90, TRUE),
    ('robot', 'robot/ailog/report', 'robot/ailog', '리포트', 3, 100, TRUE),
    ('robot', 'robot/ailog/ai-chat-settings', 'robot/ailog', '채팅 설정', 3, 110, TRUE),
    ('robot', 'robot/groups', 'robot', '그룹 관리', 2, 120, TRUE),
    ('robot', 'robot/users', 'robot', '사용자 관리', 2, 130, TRUE),

    ('ota', 'ota/campaign', 'ota', '캠페인', 2, 200, TRUE),
    ('ota', 'ota/campaign/detail/:id?', 'ota/campaign/detail', '캠페인 상세', 4, 210, TRUE),
    ('ota', 'ota/artifact', 'ota', '아티팩트', 2, 220, TRUE),
    ('ota', 'ota/artifact/detail/:id?', 'ota/artifact/detail', '아티팩트 상세', 4, 230, TRUE),
    ('ota', 'ota/target-group', 'ota', '타겟 그룹', 2, 240, TRUE),
    ('ota', 'ota/target-group/detail/:id?', 'ota/target-group/detail', '타겟 그룹 상세', 4, 250, TRUE),
    ('ota', 'ota/policy', 'ota', '정책', 2, 260, TRUE),
    ('ota', 'ota/policy/detail/:id?', 'ota/policy/detail', '정책 상세', 4, 270, TRUE),
    ('ota', 'ota/organization', 'ota', '조직', 2, 280, TRUE),
    ('ota', 'ota/organization/detail/:id?', 'ota/organization/detail', '조직 상세', 4, 290, TRUE),
    ('ota', 'ota/management/approve', 'ota/management', '승인', 3, 300, TRUE),
    ('ota', 'ota/management/request', 'ota/management', '요청', 3, 310, TRUE),
    ('ota', 'ota/management/role', 'ota/management', '권한', 3, 320, TRUE),
    ('ota', 'ota/device', 'ota', '디바이스', 2, 330, TRUE),
    ('ota', 'ota/settings/device-type', 'ota/settings', '디바이스 타입', 3, 340, TRUE),
    ('ota', 'ota/settings/device-type/detail/:id?', 'ota/settings/device-type/detail', '디바이스 타입 상세', 5, 350, TRUE),
    ('ota', 'ota/settings/module', 'ota/settings', '모듈', 3, 360, TRUE),
    ('ota', 'ota/settings/module/detail/:id?', 'ota/settings/module/detail', '모듈 상세', 5, 370, TRUE),
    ('ota', 'ota/settings/action', 'ota/settings', '동작', 3, 380, TRUE),
    ('ota', 'ota/settings/action/detail/:id?', 'ota/settings/action/detail', '동작 상세', 5, 390, TRUE),
    ('ota', 'ota/settings/cicd', 'ota/settings', 'CI/CD 설정', 3, 400, TRUE),
    ('ota', 'ota/settings/api-doc', 'ota/settings', 'API 문서', 3, 410, TRUE),
    ('ota', 'ota/settings/icons', 'ota/settings', '아이콘 뷰어(Dev)', 3, 420, TRUE),

    ('cms', 'cms/content', 'cms', '콘텐츠', 2, 500, TRUE),
    ('cms', 'cms/content/detail/:id?', 'cms/content/detail', '콘텐츠 상세', 4, 510, TRUE),
    ('cms', 'cms/label', 'cms', '라벨', 2, 520, TRUE),
    ('cms', 'cms/label/detail/:id?', 'cms/label/detail', '라벨 상세', 4, 530, TRUE),
    ('cms', 'cms/embedding', 'cms', '음성대화', 2, 540, TRUE),
    ('cms', 'cms/embedding/detail/:id?', 'cms/embedding/detail', '음성대화 문서 상세', 4, 550, TRUE),
    ('cms', 'cms/embedding/actions', 'cms/embedding', '로봇액션', 3, 560, TRUE),
    ('cms', 'cms/embedding/actions/detail/:id?', 'cms/embedding/actions/detail', '로봇액션 상세', 5, 570, TRUE),
    ('cms', 'cms/embedding/test', 'cms/embedding', '음성대화 테스트', 3, 580, TRUE),
    ('cms', 'cms/embedding/versions', 'cms/embedding', '벡터 버전', 3, 590, TRUE),
    ('cms', 'cms/settings/contentType', 'cms/settings', '콘텐츠 타입', 3, 600, TRUE),
    ('cms', 'cms/settings/contentType/detail/:id?', 'cms/settings/contentType/detail', '콘텐츠 타입 상세', 5, 610, TRUE),
    ('cms', 'cms/settings/category', 'cms/settings', '카테고리', 3, 620, TRUE),
    ('cms', 'cms/settings/category/detail/:id?', 'cms/settings/category/detail', '카테고리 상세', 5, 630, TRUE),
    ('cms', 'cms/settings/api-doc', 'cms/settings', 'API 문서', 3, 640, TRUE),

    ('tms', 'tms', NULL, 'Task Flow 목록', 1, 700, TRUE),
    ('tms', 'tms/taskflows/:taskFlowId/detail', 'tms/taskflows/:taskFlowId', 'Task Flow 상세', 4, 710, TRUE),
    ('tms', 'tms/taskflows/:taskFlowId/detail/deploy', 'tms/taskflows/:taskFlowId/detail', 'Task Flow 배포', 5, 720, TRUE),
    ('tms', 'tms/taskflows/:taskFlowId/canvas', 'tms/taskflows/:taskFlowId', 'Task Flow 캔버스', 4, 730, TRUE),
    ('tms', 'tms/robots', 'tms', 'Robot List', 2, 740, TRUE),
    ('tms', 'tms/robots/:robotId/detail', 'tms/robots/:robotId', 'Robot Detail', 4, 750, TRUE)
)
INSERT INTO chat_screen (
  app_key,
  key,
  route_key,
  screen_name,
  depth,
  sort_order,
  enabled
)
SELECT
  app_key,
  key,
  route_key,
  screen_name,
  depth,
  sort_order,
  enabled
FROM input
ON CONFLICT (key)
DO UPDATE SET
  app_key = EXCLUDED.app_key,
  route_key = EXCLUDED.route_key,
  screen_name = EXCLUDED.screen_name,
  depth = EXCLUDED.depth,
  sort_order = EXCLUDED.sort_order,
  enabled = EXCLUDED.enabled,
  updated_at = NOW();

INSERT INTO chat_screen_tool (
  app_key,
  key,
  route_key,
  tool_name,
  display_name,
  kind,
  description,
  api_name,
  method,
  endpoint,
  static_payload,
  sort_order,
  enabled
)
SELECT
  'common' AS app_key,
  'common' AS key,
  'common' AS route_key,
  (
    'navigate_' ||
    COALESCE(NULLIF(TRIM(BOTH '_' FROM LOWER(REGEXP_REPLACE(screen.key, '[^a-zA-Z0-9]+', '_', 'g'))), ''), 'common')
  ) AS tool_name,
  screen.screen_name AS display_name,
  action_type.kind AS kind,
  NULL AS description,
  action_type.api_name AS api_name,
  action_type.method AS method,
  screen.key AS endpoint,
  jsonb_build_object('path', screen.key) AS static_payload,
  10000 + screen.sort_order AS sort_order,
  TRUE AS enabled
FROM chat_screen AS screen
JOIN chat_action_type AS action_type
  ON action_type.key = 'screen_navigation'
 AND action_type.enabled = TRUE
WHERE screen.app_key IN ('robot', 'ota', 'cms', 'tms')
  AND screen.enabled = TRUE
ON CONFLICT (route_key, tool_name)
DO UPDATE SET
  display_name = EXCLUDED.display_name,
  kind = EXCLUDED.kind,
  api_name = EXCLUDED.api_name,
  method = EXCLUDED.method,
  endpoint = EXCLUDED.endpoint,
  static_payload = EXCLUDED.static_payload,
  sort_order = EXCLUDED.sort_order,
  enabled = EXCLUDED.enabled,
  updated_at = NOW();
