-- Move broad info RAG chunk to common so guide queries can resolve from the shared collection.
-- KST timestamped file.

BEGIN;

-- 1) Preview the row to be moved
SELECT id, app_key, key, chunk_key, title, keywords, intent_type, sort_order, enabled, updated_at
FROM chat_rag_doc
WHERE id = 62;

-- 2) Move the event-specific chunk into the common collection
UPDATE chat_rag_doc
SET
  app_key = 'common',
  key = 'common'
WHERE id = 62;

-- 3) Verify the common collection now contains both shared chunks
SELECT id, app_key, key, chunk_key, title, keywords, intent_type, sort_order, enabled, updated_at
FROM chat_rag_doc
WHERE key = 'common'
ORDER BY sort_order ASC, id ASC;

COMMIT;
