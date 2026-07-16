BEGIN;

-- 화면 이동(NAVIGATE)은 chat_screen 기준 자동 처리로 전환한다.
-- 공통 액션에 남아있는 NAVIGATE 도구를 정리한다.
DELETE FROM chat_screen_tool
WHERE key = 'common'
  AND UPPER(COALESCE(method, '')) = 'NAVIGATE';

COMMIT;
