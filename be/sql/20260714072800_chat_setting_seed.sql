INSERT INTO chat_setting (key, value)
VALUES
  (
    'llmProviderSchema',
    '[
      {
        "key": "llmProvider",
        "label": "LLM Provider",
        "type": "select",
        "options": [
          { "value": "azure", "label": "Azure OpenAI" },
          { "value": "vertex", "label": "Vertex AI" }
        ],
        "enabled": true
      }
    ]'::jsonb
  )
ON CONFLICT (key) DO UPDATE
SET value = EXCLUDED.value,
    updated_at = NOW();

INSERT INTO chat_setting (key, value)
VALUES (
  'llmProvider',
  '"azure"'::jsonb
)
ON CONFLICT (key) DO NOTHING;