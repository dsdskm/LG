BEGIN;

-- cache_key 계산에 digest()를 사용한다.
CREATE EXTENSION IF NOT EXISTS pgcrypto;

WITH seed_input AS (
  SELECT
    '오늘 이슈 보여줘'::text AS phrase,
    CURRENT_DATE::text AS start_date,
    CURRENT_DATE::text AS end_date,
    86400::int AS ttl_seconds
  UNION ALL
  SELECT
    '어제 이슈 보여줘'::text,
    (CURRENT_DATE - INTERVAL '1 day')::date::text,
    (CURRENT_DATE - INTERVAL '1 day')::date::text,
    86400
  UNION ALL
  SELECT
    '일주일간 이슈 보여줘'::text,
    (CURRENT_DATE - INTERVAL '6 day')::date::text,
    CURRENT_DATE::text,
    86400
  UNION ALL
  SELECT
    '한달간 이슈 보여줘'::text,
    (CURRENT_DATE - INTERVAL '29 day')::date::text,
    CURRENT_DATE::text,
    86400
  UNION ALL
  SELECT
    '3개월간 이슈 보여줘'::text,
    (CURRENT_DATE - INTERVAL '89 day')::date::text,
    CURRENT_DATE::text,
    86400
),
keyed AS (
  SELECT
    phrase,
    start_date,
    end_date,
    ttl_seconds,
    (
      '{"eventAnalyzerUrl":"","filters":{"end":"' || end_date || '","func":null,"keyword":null,"severity":null,"start":"' || start_date || '","status":null},"routeKey":"robot/ailog/event","scope":{},"tokenDigest":null}'
    ) AS key_raw
  FROM seed_input
)
INSERT INTO chat_event_query_cache (
  cache_key,
  route_key,
  payload,
  expires_at,
  hit_count,
  last_hit_at,
  created_at,
  updated_at
)
SELECT
  encode(digest(key_raw, 'sha1'), 'hex') AS cache_key,
  'robot/ailog/event'::text AS route_key,
  jsonb_build_object(
    'resolvedFilters', jsonb_build_object(
      'startDate', start_date,
      'endDate', end_date,
      'severity', NULL,
      'func', NULL,
      'status', NULL,
      'searchQuery', NULL
    ),
    'matchedCount', 0,
    'summary', phrase || ' (seed cache)',
    'sampleItems', '[]'::jsonb
  ) AS payload,
  NOW() + (ttl_seconds || ' seconds')::interval AS expires_at,
  0 AS hit_count,
  NULL::timestamptz AS last_hit_at,
  NOW() AS created_at,
  NOW() AS updated_at
FROM keyed
ON CONFLICT (cache_key) DO UPDATE
SET
  route_key = EXCLUDED.route_key,
  payload = EXCLUDED.payload,
  expires_at = EXCLUDED.expires_at,
  updated_at = NOW();

COMMIT;
