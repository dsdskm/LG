BEGIN;

-- 목적:
-- "주행 기능 이슈 보여줘" 같은 문장을 keyword가 아닌 func 필터로 매핑한다.

INSERT INTO public.chat_event_rule (
  route_key,
  rule_key,
  intent_key,
  pattern_regex,
  filters_template,
  parse_date_range,
  parse_period,
  parse_severity,
  parse_func,
  parse_status,
  fallback_keyword,
  enabled,
  priority,
  confidence,
  created_at,
  updated_at
)
VALUES (
  'robot/ailog/event',
  'issue-function',
  'ailog-event-query',
  '([^\\s,]+)\\s*기능.*(이슈|이벤트)',
  '{"func":"$1"}'::jsonb,
  false,
  false,
  false,
  true,
  false,
  false,
  true,
  975,
  0.97,
  NOW(),
  NOW()
)
ON CONFLICT (route_key, rule_key)
DO UPDATE SET
  pattern_regex = EXCLUDED.pattern_regex,
  filters_template = EXCLUDED.filters_template,
  parse_date_range = EXCLUDED.parse_date_range,
  parse_period = EXCLUDED.parse_period,
  parse_severity = EXCLUDED.parse_severity,
  parse_func = EXCLUDED.parse_func,
  parse_status = EXCLUDED.parse_status,
  fallback_keyword = EXCLUDED.fallback_keyword,
  enabled = EXCLUDED.enabled,
  priority = EXCLUDED.priority,
  confidence = EXCLUDED.confidence,
  updated_at = NOW();

COMMIT;
