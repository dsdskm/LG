BEGIN;

INSERT INTO chat_query_phrase_map (
  route_key,
  phrase,
  phrase_norm,
  intent_key,
  filters_template,
  enabled,
  priority,
  updated_at
) VALUES
(
  'robot/ailog/event',
  '오늘 이슈 보여줘',
  '오늘이슈보여줘',
  'period_today',
  '{"period":"today"}'::jsonb,
  true,
  10,
  NOW()
),
(
  'robot/ailog/event',
  '어제 이슈 보여줘',
  '어제이슈보여줘',
  'period_yesterday',
  '{"period":"yesterday"}'::jsonb,
  true,
  10,
  NOW()
),
(
  'robot/ailog/event',
  '일주일간 이슈 보여줘',
  '일주일간이슈보여줘',
  'period_week',
  '{"period":"week"}'::jsonb,
  true,
  20,
  NOW()
),
(
  'robot/ailog/event',
  '일주일 동안 이슈 보여줘',
  '일주일동안이슈보여줘',
  'period_week',
  '{"period":"week"}'::jsonb,
  true,
  20,
  NOW()
),
(
  'robot/ailog/event',
  '한달간 이슈 보여줘',
  '한달간이슈보여줘',
  'period_month',
  '{"period":"month"}'::jsonb,
  true,
  30,
  NOW()
),
(
  'robot/ailog/event',
  '1개월간 이슈 보여줘',
  '1개월간이슈보여줘',
  'period_month',
  '{"period":"month"}'::jsonb,
  true,
  30,
  NOW()
),
(
  'robot/ailog/event',
  '3개월간 이슈 보여줘',
  '3개월간이슈보여줘',
  'period_3month',
  '{"period":"3month"}'::jsonb,
  true,
  40,
  NOW()
),
(
  'robot/ailog/event',
  '3달간 이슈 보여줘',
  '3달간이슈보여줘',
  'period_3month',
  '{"period":"3month"}'::jsonb,
  true,
  40,
  NOW()
),
(
  'robot/ailog/event',
  '3개월동안이슈 보여줘',
  '3개월동안이슈보여줘',
  'period_3month',
  '{"period":"3month"}'::jsonb,
  true,
  40,
  NOW()
)
ON CONFLICT (route_key, phrase_norm) DO UPDATE
SET
  phrase = EXCLUDED.phrase,
  intent_key = EXCLUDED.intent_key,
  filters_template = EXCLUDED.filters_template,
  enabled = EXCLUDED.enabled,
  priority = EXCLUDED.priority,
  updated_at = NOW();

COMMIT;
