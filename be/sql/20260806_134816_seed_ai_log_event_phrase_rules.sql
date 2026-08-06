BEGIN;

-- ai_log_event rule seed (legacy phrase-map 기반 rule-first)
-- 대상 route: robot/ailog/event

INSERT INTO public.chat_query_phrase_map (
  route_key,
  phrase,
  phrase_norm,
  intent_key,
  filters_template,
  priority,
  enabled,
  created_at,
  updated_at
)
VALUES
  (
    'robot/ailog/event',
    '오늘 이슈 보여줘',
    '오늘이슈보여줘',
    'event.list.today',
    '{"period":"today"}'::jsonb,
    10,
    true,
    NOW(),
    NOW()
  ),
  (
    'robot/ailog/event',
    '어제 이슈 보여줘',
    '어제이슈보여줘',
    'event.list.yesterday',
    '{}'::jsonb,
    10,
    true,
    NOW(),
    NOW()
  ),
  (
    'robot/ailog/event',
    '오늘 이벤트 보여줘',
    '오늘이벤트보여줘',
    'event.list.today',
    '{"period":"today"}'::jsonb,
    10,
    true,
    NOW(),
    NOW()
  ),
  (
    'robot/ailog/event',
    '어제 이벤트 보여줘',
    '어제이벤트보여줘',
    'event.list.yesterday',
    '{}'::jsonb,
    10,
    true,
    NOW(),
    NOW()
  )
ON CONFLICT (route_key, phrase_norm)
DO UPDATE SET
  phrase = EXCLUDED.phrase,
  intent_key = EXCLUDED.intent_key,
  filters_template = EXCLUDED.filters_template,
  priority = EXCLUDED.priority,
  enabled = EXCLUDED.enabled,
  updated_at = NOW();

COMMIT;
