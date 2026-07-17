BEGIN;

-- robot/ailog/event: 사용자 발화 예시 강화 (NLU 힌트)
INSERT INTO chat_guidance (app_key, key, route_key, examples)
VALUES (
  'robot',
  'robot/ailog/event',
  'robot/ailog',
  '[
    "오늘 이슈 보여줘",
    "7월1일부터 7월2일까지 이슈 보여줘",
    "주행 이슈 보여줘",
    "한달간 이슈 보여줘",
    "최근 일주일 이슈 보여줘"
  ]'::jsonb
)
ON CONFLICT (key) DO UPDATE
SET
  app_key = EXCLUDED.app_key,
  route_key = EXCLUDED.route_key,
  examples = EXCLUDED.examples,
  updated_at = NOW();

-- query_events 액션 입력 스키마 보강 (파라미터 위치/설명)
UPDATE chat_screen_tool
SET
  request_params = '[
    {"name":"period","type":"string","in":"query","enum":["today","week","month","오늘","일주일","한달","한 달"],"description":"상대 기간"},
    {"name":"start","type":"string","in":"query","description":"시작일. YYYY-MM-DD 또는 M월D일(예: 7월1일)"},
    {"name":"end","type":"string","in":"query","description":"종료일. YYYY-MM-DD 또는 M월D일(예: 7월2일)"},
    {"name":"severity","type":"string","in":"query","description":"심각도"},
    {"name":"func","type":"string","in":"query","description":"기능 키(예: navigation, 주행)"},
    {"name":"status","type":"string","in":"query","description":"이벤트 상태"},
    {"name":"keyword","type":"string","in":"query","description":"검색어"}
  ]'::jsonb,
  request_query = COALESCE(request_query, '{}'::jsonb),
  updated_at = NOW()
WHERE route_key = 'robot/ailog'
  AND tool_name = 'query_events';

COMMIT;
