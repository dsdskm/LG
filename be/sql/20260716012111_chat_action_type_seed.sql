CREATE TABLE IF NOT EXISTS chat_action_type (
  id SERIAL PRIMARY KEY,
  key TEXT NOT NULL UNIQUE,
  label TEXT NOT NULL,
  kind TEXT NOT NULL DEFAULT 'action',
  api_name TEXT NOT NULL,
  method TEXT NOT NULL,
  requires_path BOOLEAN NOT NULL DEFAULT TRUE,
  enabled BOOLEAN NOT NULL DEFAULT TRUE,
  sort_order INT NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO chat_action_type (key, label, kind, api_name, method, requires_path, enabled, sort_order)
VALUES ('screen_navigation', '화면 이동', 'action', 'navigate_to_screen', 'NAVIGATE', TRUE, TRUE, 1)
ON CONFLICT (key) DO UPDATE
SET
  label = EXCLUDED.label,
  kind = EXCLUDED.kind,
  api_name = EXCLUDED.api_name,
  method = EXCLUDED.method,
  requires_path = EXCLUDED.requires_path,
  enabled = EXCLUDED.enabled,
  sort_order = EXCLUDED.sort_order,
  updated_at = NOW();
