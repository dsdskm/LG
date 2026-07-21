BEGIN;

INSERT INTO chat_action_type (
  key,
  label,
  kind,
  api_name,
  method,
  requires_path,
  enabled,
  sort_order
)
VALUES (
  'tms_linear_taskflow',
  'TMS 직선 태스크플로우 구성',
  'action',
  'compose_linear_taskflow',
  'LOCAL',
  FALSE,
  TRUE,
  920
)
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

WITH target_screen AS (
  SELECT
    s.app_key,
    s.key,
    COALESCE(NULLIF(s.route_key, ''), regexp_replace(s.key, '/[^/]+$', '')) AS normalized_route_key
  FROM chat_screen s
  WHERE s.enabled = TRUE
    AND s.key IN (
      'tms/taskflows/:taskFlowId/canvas',
      'tms/taskflows/:id/canvas',
      'tms/taskflows/canvas',
      'tms/taskflows'
    )
  ORDER BY
    CASE
      WHEN s.key = 'tms/taskflows/:taskFlowId/canvas' THEN 1
      WHEN s.key = 'tms/taskflows/:id/canvas' THEN 2
      WHEN s.key = 'tms/taskflows/canvas' THEN 3
      ELSE 4
    END
  LIMIT 1
)
INSERT INTO chat_screen_tool (
  app_key,
  key,
  route_key,
  tool_name,
  display_name,
  kind,
  description,
  api_name,
  method,
  request_headers,
  request_query,
  request_body,
  context_params,
  request_params,
  static_payload,
  sort_order,
  enabled
)
SELECT
  ts.app_key,
  ts.key,
  ts.normalized_route_key,
  'compose_linear_taskflow',
  '직선 태스크플로우 구성',
  'action',
  '저장 전 캔버스에 적용할 직선 태스크플로우 초안을 생성한다.',
  'compose_linear_taskflow',
  'LOCAL',
  '{}'::jsonb,
  '{}'::jsonb,
  '{}'::jsonb,
  '[]'::jsonb,
  '[{"name":"steps","type":"array","required":true,"in":"body"}]'::jsonb,
  '{"layout":"linear","mode":"replace"}'::jsonb,
  COALESCE((SELECT MAX(st.sort_order) FROM chat_screen_tool st WHERE st.key = ts.key), 0) + 1,
  TRUE
FROM target_screen ts
ON CONFLICT (route_key, tool_name) DO UPDATE
SET
  app_key = EXCLUDED.app_key,
  key = EXCLUDED.key,
  display_name = EXCLUDED.display_name,
  kind = EXCLUDED.kind,
  description = EXCLUDED.description,
  api_name = EXCLUDED.api_name,
  method = EXCLUDED.method,
  request_headers = EXCLUDED.request_headers,
  request_query = EXCLUDED.request_query,
  request_body = EXCLUDED.request_body,
  context_params = EXCLUDED.context_params,
  request_params = EXCLUDED.request_params,
  static_payload = EXCLUDED.static_payload,
  enabled = EXCLUDED.enabled,
  updated_at = NOW();

COMMIT;
