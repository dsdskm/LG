BEGIN;

-- 목적:
-- 1) robot/ailog/event 룰에서 원문 전체 fallback keyword 주입을 끈다.
-- 2) keyword 검색은 "~검색해줘/찾아줘" 패턴에만 반응하도록 룰을 추가한다.
-- 3) phrase-map의 어제 케이스도 period를 명시해 원문 keyword fallback이 개입하지 않게 한다.

-- 1) 기존 룰의 fallback keyword 비활성화
UPDATE public.chat_event_rule
SET fallback_keyword = false,
    updated_at = NOW()
WHERE route_key = 'robot/ailog/event';

-- 2) 명시 검색 룰 추가/갱신 (예: "오늘 배터리 이슈 검색해줘", "주행 찾아줘")
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
  'issue-explicit-search-keyword',
  'ailog-event-query',
  '^(?:(오늘|어제|최근\\s*\\d+\\s*일|한달간|한달|1개월|일주일(?:간)?|주간|이번주|지난주|이번달|지난달|\\d+\\s*(?:달|개월)\\s*(?:전|동안)?|\\d{1,2}\\s*일\\s*전)\\s+)?(.+?)\\s*(?:이슈|이벤트)?\\s*(?:을|를)?\\s*(검색해줘|찾아줘)\\s*$',
  '{"period":"$1","keyword":"$2"}'::jsonb,
  false,
  true,
  true,
  true,
  true,
  false,
  true,
 995,
  0.98,
  NOW(),
  NOW()
)
ON CONFLICT (route_key, rule_key)
DO UPDATE SET
  intent_key = EXCLUDED.intent_key,
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

-- 3) phrase-map 어제 항목도 기간을 명시해 원문 keyword로 흐르지 않게 정리
UPDATE public.chat_query_phrase_map
SET filters_template = '{"period":"yesterday"}'::jsonb,
    updated_at = NOW()
WHERE route_key = 'robot/ailog/event'
  AND intent_key = 'event.list.yesterday';

COMMIT;
