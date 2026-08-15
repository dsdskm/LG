BEGIN;

ALTER TABLE public.rule
  DROP COLUMN IF EXISTS example_messages;

COMMIT;