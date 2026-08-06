-- issue-function 룰 변경 후 상태 확인
SELECT
  route_key,
  rule_key,
  pattern_regex,
  filters_template,
  fallback_keyword,
  priority,
  enabled
FROM public.chat_event_rule
WHERE route_key = 'robot/ailog/event'
  AND rule_key = 'issue-function';
