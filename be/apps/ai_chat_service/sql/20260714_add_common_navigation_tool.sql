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
  context_params,
  request_params,
  static_payload,
  sort_order,
  enabled
) VALUES (
  'common',
  'common',
  NULL,
  'navigate_to_screen',
  '화면 이동',
  'action',
  '현재 화면에서 처리할 수 없는 요청을 적절한 앱/화면으로 이동시킨다.',
  'router',
  'NAVIGATE',
  '/:path',
  '[]'::jsonb,
  '[{"name":"path","type":"string","required":true,"description":"이동할 앱/화면 경로"}]'::jsonb,
  '{}'::jsonb,
  0,
  true
)
ON CONFLICT (route_key, tool_name) DO NOTHING;