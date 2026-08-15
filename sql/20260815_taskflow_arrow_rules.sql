BEGIN;

INSERT INTO public.rule (
  app_key,
  screen_key,
  rule_type,
  rule_key,
  value_json,
  enabled,
  priority
)
VALUES
  (
    'tms',
    'tms/taskflows/:taskFlowId/canvas',
    'taskflow-graph',
    'separate-arrow-lines',
    jsonb_build_object(
      'patternRegex', $regex$^\s*((?:(?:(?:->|=>|→|⇒)\s*[^\r\n]+|[^\r\n]+(?:->|=>|→|⇒)[^\r\n]+)\s*(?:\r?\n|$))+)\s*$$regex$,
      'graphOperation', 'separate-arrow-lines',
      'description', '각 화살표 줄을 기존 flow와 연결되지 않은 별도 chain으로 배치한다.'
    ),
    TRUE,
    300
  ),
  (
    'tms',
    'tms/taskflows/:taskFlowId/canvas',
    'taskflow-graph-guide',
    'arrow-format-guide',
    jsonb_build_object(
      'patternRegex', $regex$^(?![\s\S]*(?:->|=>|→|⇒))(?=[\s\S]{1,200}$)[\s\S]*(?:추가|연결|생성|만들|이어|구성)[\s\S]*$$regex$,
      'description', '자연어 노드 구성 요청에 화면별 가이드 문구를 안내한다.'
    ),
    TRUE,
    200
  )
ON CONFLICT (app_key, screen_key, rule_type, rule_key)
DO UPDATE SET
  value_json = EXCLUDED.value_json,
  enabled = EXCLUDED.enabled,
  priority = EXCLUDED.priority,
  updated_at = NOW();

COMMIT;