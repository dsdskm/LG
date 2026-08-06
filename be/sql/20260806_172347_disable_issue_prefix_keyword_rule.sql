BEGIN;

-- 목적:
-- broad prefix rule(issue-prefix-keyword)을 비활성화해
-- 기간/기능/심각도/상태 규칙이나 raw-message 파서가 먼저 처리하도록 한다.
-- 기존 데이터는 유지하고, 필요 시 다시 enabled=true 로 되돌릴 수 있게 한다.

UPDATE public.chat_event_rule
SET enabled = false,
    updated_at = NOW()
WHERE route_key = 'robot/ailog/event'
  AND rule_key = 'issue-prefix-keyword';

COMMIT;
