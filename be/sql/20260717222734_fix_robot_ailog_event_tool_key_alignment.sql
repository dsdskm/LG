BEGIN;

-- robot/ailog/event 화면에서 query_events가 항상 로드되도록 key 정합성 보정
-- 기존 route_key/tool_name은 유지하고 화면 key만 정리한다.
UPDATE chat_screen_tool
SET
  app_key = 'robot',
  key = 'robot/ailog/event',
  updated_at = NOW()
WHERE route_key = 'robot/ailog'
  AND tool_name = 'query_events';

COMMIT;
