BEGIN;

-- 목적:
-- 1) severity alias를 영문 4단계(critical/high/medium/low)만 인식하도록 제한
-- 2) "심각도 high 이슈 보여줘"와 "high 이슈 보여줘"가 동일하게 high로 매핑되도록 정리

-- 기존 severity alias는 모두 비활성화(데이터는 보존)
UPDATE public.chat_event_filter_alias
SET enabled = false,
    updated_at = NOW()
WHERE route_key = 'robot/ailog/event'
  AND alias_type = 'severity';

-- 영문 4단계 alias만 활성화 상태로 재등록(중복 삽입 방지)
WITH desired(source_pattern, normalized_value, priority) AS (
  VALUES
    ('critical', 'critical', 1000),
    ('high', 'high', 990),
    ('medium', 'medium', 980),
    ('low', 'low', 970)
)
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
SELECT
  'robot/ailog/event',
  'severity',
  d.source_pattern,
  d.normalized_value,
  'contains',
  true,
  d.priority,
  NOW(),
  NOW()
FROM desired d
WHERE NOT EXISTS (
  SELECT 1
  FROM public.chat_event_filter_alias a
  WHERE a.route_key = 'robot/ailog/event'
    AND a.alias_type = 'severity'
    AND LOWER(a.source_pattern) = LOWER(d.source_pattern)
    AND LOWER(a.normalized_value) = LOWER(d.normalized_value)
    AND a.match_mode = 'contains'
);

-- 이미 존재하던 영문 alias는 재활성화 + 우선순위 보정
UPDATE public.chat_event_filter_alias a
SET enabled = true,
    priority = d.priority,
    updated_at = NOW()
FROM (
  VALUES
    ('critical', 'critical', 1000),
    ('high', 'high', 990),
    ('medium', 'medium', 980),
    ('low', 'low', 970)
) AS d(source_pattern, normalized_value, priority)
WHERE a.route_key = 'robot/ailog/event'
  AND a.alias_type = 'severity'
  AND LOWER(a.source_pattern) = LOWER(d.source_pattern)
  AND LOWER(a.normalized_value) = LOWER(d.normalized_value);

COMMIT;
