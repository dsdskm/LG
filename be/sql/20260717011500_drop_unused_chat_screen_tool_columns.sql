BEGIN;

-- 백엔드 런타임 기준:
-- - request_params: 인자 위치(body/query/header), required 검증에 사용됨
-- - description: tool declaration 설명으로 사용됨
-- - static_payload: request_headers/request_query/request_body/base_url 컬럼 도입 후 불필요
ALTER TABLE chat_screen_tool
  DROP COLUMN IF EXISTS static_payload;

COMMIT;
