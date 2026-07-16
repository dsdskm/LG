BEGIN;

-- 기존 route key(chat-settings)를 신규 key(ai-chat-settings)로 이관한다.
UPDATE chat_screen
SET key = 'robot/ailog/ai-chat-settings',
    updated_at = NOW()
WHERE key = 'robot/ailog/chat-settings'
  AND NOT EXISTS (
    SELECT 1
    FROM chat_screen
    WHERE key = 'robot/ailog/ai-chat-settings'
  );

-- 신규 key가 이미 존재하면 구 key 잔존 레코드는 제거한다.
DELETE FROM chat_screen
WHERE key = 'robot/ailog/chat-settings'
  AND EXISTS (
    SELECT 1
    FROM chat_screen
    WHERE key = 'robot/ailog/ai-chat-settings'
  );

-- 어떤 이유로도 두 키가 모두 없는 경우를 대비해 신규 키를 보장한다.
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
