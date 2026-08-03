-- Normalize chat_prompt to 4 prompt groups only:
-- 1) common prompt:      key='common', prompt_type='system'
-- 2) common intent hint: key='common', prompt_type='intent-hint'
-- 3) screen info prompt: prompt_type='data-system'   (key <> 'common')
-- 4) screen action prompt: prompt_type='action-system' (key <> 'common')
--
-- No separate merge-mode persistence (intent-hint-mode) is kept.
-- KST timestamped file.

BEGIN;

-- 1) Preview rows that will be removed by policy
SELECT id, key, app_key, route_key, category, prompt_type, label, sort_order, enabled, updated_at
FROM chat_prompt
WHERE NOT (
  (key = 'common' AND prompt_type IN ('system', 'intent-hint'))
  OR (key <> 'common' AND prompt_type IN ('data-system', 'action-system'))
)
ORDER BY key, prompt_type, id;

-- 2) Remove rows outside the 4 allowed prompt groups
DELETE FROM chat_prompt
WHERE NOT (
  (key = 'common' AND prompt_type IN ('system', 'intent-hint'))
  OR (key <> 'common' AND prompt_type IN ('data-system', 'action-system'))
);

-- 3) Normalize labels for consistency

-- common system label
UPDATE chat_prompt
SET label = '공통 프롬프트'
WHERE key = 'common'
  AND prompt_type = 'system';

-- intent-hint labels (common only)
UPDATE chat_prompt
SET label = '공통 분기 프롬프트'
WHERE key = 'common'
  AND prompt_type = 'intent-hint';

-- screen info prompt label
UPDATE chat_prompt
SET label = '정보 프롬프트'
WHERE key <> 'common'
  AND prompt_type = 'data-system'
  AND (
    label IS NULL
    OR btrim(label) = ''
    OR label IN ('data-system', '정보 프롬프트', '액션 프롬프트')
  );

-- screen action prompt label
UPDATE chat_prompt
SET label = '액션 프롬프트'
WHERE key <> 'common'
  AND prompt_type = 'action-system'
  AND (
    label IS NULL
    OR btrim(label) = ''
    OR label IN ('action-system', '정보 프롬프트', '액션 프롬프트')
  );

-- 4) Verify remaining rows by policy
SELECT id, key, app_key, route_key, category, prompt_type, label, sort_order, enabled, updated_at
FROM chat_prompt
WHERE
  (key = 'common' AND prompt_type IN ('system', 'intent-hint'))
  OR (key <> 'common' AND prompt_type IN ('data-system', 'action-system'))
ORDER BY key, prompt_type, id;

COMMIT;
