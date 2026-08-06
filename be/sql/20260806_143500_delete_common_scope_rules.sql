BEGIN;

-- 1) 삭제 전 확인: 공통 scope 룰 잔여 데이터
SELECT route_key, COUNT(*) AS rule_count
FROM public.chat_event_rule
WHERE route_key = 'common'
GROUP BY route_key;

SELECT route_key, alias_type, COUNT(*) AS alias_count
FROM public.chat_event_filter_alias
WHERE route_key = 'common'
GROUP BY route_key, alias_type
ORDER BY alias_type;

SELECT rule_type, scope_key, COUNT(*) AS taskflow_rule_count
FROM public.chat_taskflow_rule
WHERE scope_key = 'common'
GROUP BY rule_type, scope_key
ORDER BY rule_type;

-- 2) 공통 scope 룰 데이터 삭제 (화면 단위 룰만 남김)
DELETE FROM public.chat_event_rule
WHERE route_key = 'common';

DELETE FROM public.chat_event_filter_alias
WHERE route_key = 'common';

DELETE FROM public.chat_taskflow_rule
WHERE scope_key = 'common';

-- 3) 삭제 후 검증
SELECT COUNT(*) AS remaining_common_event_rules
FROM public.chat_event_rule
WHERE route_key = 'common';

SELECT COUNT(*) AS remaining_common_event_aliases
FROM public.chat_event_filter_alias
WHERE route_key = 'common';

SELECT COUNT(*) AS remaining_common_taskflow_rules
FROM public.chat_taskflow_rule
WHERE scope_key = 'common';

COMMIT;
