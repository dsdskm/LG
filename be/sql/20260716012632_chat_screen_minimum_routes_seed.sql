INSERT INTO chat_screen (
  app_key,
  key,
  route_key,
  screen_name,
  depth,
  sort_order,
  enabled
)
VALUES
(
  'robot',
  'robot/dashboard',
  'robot',
  '대시보드',
  2,
  10,
  TRUE
),
(
  'robot',
  'robot/ailog',
  'robot',
  'AI 로그',
  2,
  20,
  TRUE
),
(
  'robot',
  'robot/ailog/event',
  'robot/ailog',
  'AI 로그 이벤트',
  3,
  30,
  TRUE
)
ON CONFLICT (key)
DO UPDATE SET
  app_key = EXCLUDED.app_key,
  route_key = EXCLUDED.route_key,
  screen_name = EXCLUDED.screen_name,
  depth = EXCLUDED.depth,
  sort_order = EXCLUDED.sort_order,
  enabled = EXCLUDED.enabled,
  updated_at = NOW();
