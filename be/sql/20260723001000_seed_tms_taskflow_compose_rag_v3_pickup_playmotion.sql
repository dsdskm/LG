BEGIN;

-- PickUp/PlayMotion 전용 RAG 분리: 기존 V2 예시는 비활성화
UPDATE chat_rag_doc
SET
  enabled = FALSE,
  updated_at = NOW()
WHERE key = 'tms/taskflows/:taskFlowId/canvas'
  AND route_key = 'tms/taskflows'
  AND scope = 'taskflow-canvas'
  AND chunk_key IN (
    'tms-taskflow-canvas-v2-example-pickup',
    'tms-taskflow-canvas-v2-example-playmotion'
  );

INSERT INTO chat_rag_doc (
  app_key,
  key,
  route_key,
  scope,
  chunk_key,
  title,
  keywords,
  body,
  sort_order,
  enabled
)
VALUES
(
  'tms',
  'tms/taskflows/:taskFlowId/canvas',
  'tms/taskflows',
  'taskflow-canvas',
  'tms-taskflow-canvas-v3-pickup-putdown-paired',
  'TMS Compose Rule V3 - PickUp PutDown Paired',
  '["PickUp", "PutDown", "pair", "same contentName", "pickup", "putdown"]'::jsonb,
  $$
규칙(V3 - PickUp/PutDown):
1) 픽업 계열 요청은 step을 PickUp -> PutDown 순서로 구성한다.
2) PutDown의 contentName은 반드시 바로 앞 PickUp의 contentName과 동일해야 한다.
3) PickUp/PutDown task-content는 flowDefinition/taskContents에 존재하는 값만 사용한다.
4) 동일 contentName의 PutDown 후보가 없으면 임의 생성하지 말고 clarification으로 안내한다.

예시:
- 입력: "박스A 픽업 태스크플로우 구성해줘"
- 기대 step:
  - { taskName: "PickUp", contentName: "박스A" }
  - { taskName: "PutDown", contentName: "박스A" }
  $$,
  250,
  TRUE
),
(
  'tms',
  'tms/taskflows/:taskFlowId/canvas',
  'tms/taskflows',
  'taskflow-canvas',
  'tms-taskflow-canvas-v3-playmotion-parallel-tts',
  'TMS Compose Rule V3 - PlayMotion Parallel With Tts',
  '["PlayMotion", "Tts", "Parallel", "main_nodes", "playmotion main", "concurrent"]'::jsonb,
  $$
규칙(V3 - PlayMotion/Tts):
1) PlayMotion 계열 요청은 각 단계를 Parallel 노드로 감싼다.
2) Parallel의 main_nodes에는 PlayMotion 노드 id를 넣는다.
3) 같은 Parallel 하위에 Tts 노드를 함께 배치해 동시 실행되도록 구성한다.
4) task-content는 flowDefinition/taskContents에 존재하는 값만 사용한다.
5) PlayMotion/Tts/Parallel 중 필수 요소가 없으면 임의 생성하지 말고 clarification으로 안내한다.

예시:
- 입력: "환영 모션 재생 태스크플로우 구성해줘"
- 기대 구조:
  - Parallel
    - PlayMotion (main)
    - Tts (동시 실행)
  $$,
  260,
  TRUE
)
ON CONFLICT (key, chunk_key) DO UPDATE
SET
  app_key = EXCLUDED.app_key,
  route_key = EXCLUDED.route_key,
  scope = EXCLUDED.scope,
  title = EXCLUDED.title,
  keywords = EXCLUDED.keywords,
  body = EXCLUDED.body,
  sort_order = EXCLUDED.sort_order,
  enabled = EXCLUDED.enabled,
  updated_at = NOW();

COMMIT;
