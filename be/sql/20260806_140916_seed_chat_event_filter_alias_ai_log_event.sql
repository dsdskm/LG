BEGIN;

INSERT INTO public.chat_event_filter_alias (
  route_key,
  alias_type,
  source_pattern,
  normalized_value,
  match_mode,
  enabled,
  priority,
  created_at,
  updated_at
)
VALUES
  ('robot/ailog/event', 'period', '오늘', 'today', 'contains', true, 1000, NOW(), NOW()),
  ('robot/ailog/event', 'period', 'today', 'today', 'contains', true, 990, NOW(), NOW()),
  ('robot/ailog/event', 'period', '어제', 'yesterday', 'contains', true, 980, NOW(), NOW()),
  ('robot/ailog/event', 'period', 'yesterday', 'yesterday', 'contains', true, 970, NOW(), NOW()),
  ('robot/ailog/event', 'period', '일주일', 'week', 'contains', true, 960, NOW(), NOW()),
  ('robot/ailog/event', 'period', 'week', 'week', 'contains', true, 950, NOW(), NOW()),
  ('robot/ailog/event', 'period', '한달', 'month', 'contains', true, 940, NOW(), NOW()),
  ('robot/ailog/event', 'period', '한 달', 'month', 'contains', true, 930, NOW(), NOW()),
  ('robot/ailog/event', 'period', '1개월', 'month', 'contains', true, 920, NOW(), NOW()),
  ('robot/ailog/event', 'period', 'month', 'month', 'contains', true, 910, NOW(), NOW()),

  ('robot/ailog/event', 'severity', 'critical', 'critical', 'contains', true, 1000, NOW(), NOW()),
  ('robot/ailog/event', 'severity', '치명', 'critical', 'contains', true, 990, NOW(), NOW()),
  ('robot/ailog/event', 'severity', '심각', 'critical', 'contains', true, 980, NOW(), NOW()),
  ('robot/ailog/event', 'severity', 'high', 'high', 'contains', true, 970, NOW(), NOW()),
  ('robot/ailog/event', 'severity', '높음', 'high', 'contains', true, 960, NOW(), NOW()),
  ('robot/ailog/event', 'severity', 'medium', 'medium', 'contains', true, 950, NOW(), NOW()),
  ('robot/ailog/event', 'severity', 'middle', 'medium', 'contains', true, 940, NOW(), NOW()),
  ('robot/ailog/event', 'severity', '중간', 'medium', 'contains', true, 930, NOW(), NOW()),
  ('robot/ailog/event', 'severity', 'low', 'low', 'contains', true, 920, NOW(), NOW()),
  ('robot/ailog/event', 'severity', '낮음', 'low', 'contains', true, 910, NOW(), NOW()),

  ('robot/ailog/event', 'status', 'received', 'received', 'exact', true, 1000, NOW(), NOW()),
  ('robot/ailog/event', 'status', '로그획득', 'received', 'contains', true, 990, NOW(), NOW()),
  ('robot/ailog/event', 'status', 'prepared', 'prepared', 'exact', true, 980, NOW(), NOW()),
  ('robot/ailog/event', 'status', '분석준비완료', 'prepared', 'contains', true, 970, NOW(), NOW()),
  ('robot/ailog/event', 'status', 'prepare_failed', 'prepare_failed', 'exact', true, 960, NOW(), NOW()),
  ('robot/ailog/event', 'status', '분석준비실패', 'prepare_failed', 'contains', true, 950, NOW(), NOW()),
  ('robot/ailog/event', 'status', 'analyzing', 'analyzing', 'exact', true, 940, NOW(), NOW()),
  ('robot/ailog/event', 'status', '분석중', 'analyzing', 'contains', true, 930, NOW(), NOW()),
  ('robot/ailog/event', 'status', 'analyzed', 'analyzed', 'exact', true, 920, NOW(), NOW()),
  ('robot/ailog/event', 'status', '분석완료', 'analyzed', 'contains', true, 910, NOW(), NOW()),
  ('robot/ailog/event', 'status', 'analyze_failed', 'analyze_failed', 'exact', true, 900, NOW(), NOW()),
  ('robot/ailog/event', 'status', '분석실패', 'analyze_failed', 'contains', true, 890, NOW(), NOW()),
  ('robot/ailog/event', 'status', 'completed', 'completed', 'exact', true, 880, NOW(), NOW()),
  ('robot/ailog/event', 'status', '조치완료', 'completed', 'contains', true, 870, NOW(), NOW()),
  ('robot/ailog/event', 'status', 'failed', 'failed', 'exact', true, 860, NOW(), NOW()),
  ('robot/ailog/event', 'status', '오류발생', 'failed', 'contains', true, 850, NOW(), NOW())
;

COMMIT;
