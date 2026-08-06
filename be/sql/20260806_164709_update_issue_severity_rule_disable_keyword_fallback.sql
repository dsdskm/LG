BEGIN;

-- 목적:
-- severity/status 룰이 매칭되면 사용자 원문 전체를 keyword 검색어로 넘기지 않도록 한다.
-- 이 룰은 severity 또는 status 토큰을 이미 판별하므로 fallback keyword 는 불필요하다.

UPDATE public.chat_event_rule
SET fallback_keyword = false,
    updated_at = NOW()
WHERE route_key = 'robot/ailog/event'
  AND rule_key = 'issue-severity-status';

COMMIT;
