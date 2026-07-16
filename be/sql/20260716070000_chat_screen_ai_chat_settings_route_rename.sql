BEGIN;

-- robot/ailog/chat-settings -> robot/ailog/ai-chat-settings 로 route key를 이관한다.
UPDATE chat_screen
SET key = 'robot/ailog/ai-chat-settings',
    updated_at = NOW()
WHERE key = 'robot/ailog/chat-settings'
  AND NOT EXISTS (
    SELECT 1
    FROM chat_screen
    WHERE key = 'robot/ailog/ai-chat-settings'
  );

-- 신규 key가 이미 있으면 구 key 레코드는 제거한다.
DELETE FROM chat_screen
WHERE key = 'robot/ailog/chat-settings'
  AND EXISTS (
    SELECT 1
    FROM chat_screen
    WHERE key = 'robot/ailog/ai-chat-settings'
  );

-- 두 key가 모두 없을 때 신규 key를 기본값으로 생성한다.
INSERT INTO chat_screen (
  app_key,
  key,
  route_key,
  screen_name,
  depth,
  sort_order,
  enabled
)
SELECT
  'robot',
  'robot/ailog/ai-chat-settings',
  'robot/ailog',
  'AI 로그 설정',
  3,
  999,
  TRUE
WHERE NOT EXISTS (
  SELECT 1
  FROM chat_screen
  WHERE key = 'robot/ailog/ai-chat-settings'
);

COMMIT;
