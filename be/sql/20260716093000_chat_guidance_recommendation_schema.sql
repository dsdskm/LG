BEGIN;

ALTER TABLE chat_guidance
  ADD COLUMN IF NOT EXISTS created_at timestamptz NOT NULL DEFAULT now();

ALTER TABLE chat_guidance
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

ALTER TABLE chat_guidance
  ALTER COLUMN examples TYPE jsonb USING COALESCE(examples, '[]'::jsonb),
  ALTER COLUMN examples SET DEFAULT '[]'::jsonb,
  ALTER COLUMN examples SET NOT NULL;

UPDATE chat_guidance
SET examples = COALESCE(
  (
    SELECT jsonb_agg(to_jsonb(val))
    FROM jsonb_array_elements(COALESCE(chat_guidance.examples, '[]'::jsonb)) AS elem
    CROSS JOIN LATERAL (
      SELECT CASE
        WHEN jsonb_typeof(elem) = 'string' THEN NULLIF(elem #>> '{}', '')
        WHEN jsonb_typeof(elem) = 'object' AND (elem ? 'q') THEN NULLIF(elem->>'q', '')
        ELSE NULL
      END AS val
    ) AS extracted
    WHERE extracted.val IS NOT NULL
  ),
  '[]'::jsonb
);

ALTER TABLE chat_guidance DROP COLUMN IF EXISTS chat_action;
ALTER TABLE chat_guidance DROP COLUMN IF EXISTS screen_name;
ALTER TABLE chat_guidance DROP COLUMN IF EXISTS sections;
ALTER TABLE chat_guidance DROP COLUMN IF EXISTS fallback_text;
ALTER TABLE chat_guidance DROP COLUMN IF EXISTS sort_order;
ALTER TABLE chat_guidance DROP COLUMN IF EXISTS enabled;

COMMIT;
