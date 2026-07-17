BEGIN;

-- robot/ailog/event: query_events REST 호출 정보
UPDATE chat_screen_tool
SET
  api_name = 'event_analyzer',
  method = 'GET',
  endpoint = '/query/logs',
  base_url = 'http://event_analyzer_service:3002',
  request_headers = '{}'::jsonb,
  request_query = '{}'::jsonb,
  request_body = '{}'::jsonb,
  updated_at = NOW()
WHERE route_key = 'robot/ailog'
  AND tool_name = 'query_events';

-- robot/ailog/event: list_recommended_actions REST 호출 정보
UPDATE chat_screen_tool
SET
  api_name = 'action_runner',
  method = 'GET',
  endpoint = '/actions',
  base_url = 'http://action_runner_service:3004',
  request_headers = '{}'::jsonb,
  request_query = '{}'::jsonb,
  request_body = '{}'::jsonb,
  updated_at = NOW()
WHERE route_key = 'robot/ailog'
  AND tool_name = 'list_recommended_actions';

-- robot/ailog/event: run_action REST 호출 정보
UPDATE chat_screen_tool
SET
  api_name = 'action_runner',
  method = 'POST',
  endpoint = '/actions/run',
  base_url = 'http://action_runner_service:3004',
  request_headers = '{}'::jsonb,
  request_query = '{}'::jsonb,
  request_body = '{}'::jsonb,
  updated_at = NOW()
WHERE route_key = 'robot/ailog'
  AND tool_name = 'run_action';

COMMIT;
