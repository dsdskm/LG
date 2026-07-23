BEGIN;

-- 1) Prompt 최소화: 태스크플로우 구성 규칙만 유지
INSERT INTO chat_prompt (
  key,
  app_key,
  route_key,
  category,
  prompt_type,
  label,
  content,
  sort_order,
  enabled
)
VALUES (
  'tms/taskflows/:taskFlowId/canvas',
  'tms',
  'tms/taskflows',
  'screen',
  'action-system',
  'TMS Taskflow Compose System Prompt V2 (Minimal)',
  $$
너는 TMS Taskflow Canvas 구성 에이전트다.

핵심 규칙:
- 사용자의 "태스크플로우 구성" 요청만 처리한다.
- 개별 노드 편집(추가/수정/삭제) 요청은 수행하지 않는다.
- 가능한 경우 canvasDraft(nodes/edges/viewport/flowMode)를 반환한다.
- start 노드는 항상 유지한다.

태스크 매핑 규칙:
- 이동/경로/"A->B->C" 요청은 MoveTo 중심으로 구성한다.
- 픽업/집기/수거 요청은 PickUp 중심으로 구성한다.
- 모션/동작/제스처 요청은 PlayMotion 중심으로 구성한다.

데이터 제한:
- flowDefinition/taskContents에 존재하는 task/content만 사용한다.
- 존재하지 않는 task/content를 임의 생성하지 않는다.

불가 시 응답:
- 필요한 task/content가 없으면 clarification으로 부족한 조건을 안내한다.
  $$,
  100,
  TRUE
)
ON CONFLICT (key, prompt_type) DO UPDATE
SET
  app_key = EXCLUDED.app_key,
  route_key = EXCLUDED.route_key,
  category = EXCLUDED.category,
  label = EXCLUDED.label,
  content = EXCLUDED.content,
  sort_order = EXCLUDED.sort_order,
  enabled = EXCLUDED.enabled,
  updated_at = NOW();

-- 2) 기존 tms-taskflow-canvas-* 청크 비활성화 (재구성)
UPDATE chat_rag_doc
SET
  enabled = FALSE,
  updated_at = NOW()
WHERE key = 'tms/taskflows/:taskFlowId/canvas'
  AND route_key = 'tms/taskflows'
  AND scope = 'taskflow-canvas'
  AND chunk_key LIKE 'tms-taskflow-canvas-%';

-- 3) V2 RAG: 정책 + 태스크별 예시
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
  'tms-taskflow-canvas-v2-policy',
  'TMS Taskflow Compose Policy V2',
  '["taskflow", "compose", "MoveTo", "PickUp", "PlayMotion", "canvasDraft"]'::jsonb,
  $$
구성 정책(V2):
1) 요청이 "태스크플로우 구성"인지 먼저 확인한다.
2) 단계 추출 후 step별 taskName을 아래 규칙으로 결정한다.
   - MoveTo: 이동, 경로, A->B->C, ~로 이동
   - PickUp: 픽업, 집어, 수거, 적재
   - PlayMotion: 모션, 동작, 제스처, 포즈
3) 동일 요청에 여러 의도가 섞이면 step별로 taskName을 분리 적용한다.
4) task/content는 flowDefinition/taskContents에서 매칭되는 값만 사용한다.
5) 매칭 실패 step은 임의 생성하지 말고 clarification으로 반환한다.
6) 가능하면 canvasDraft를 우선 반환한다.
  $$,
  200,
  TRUE
),
(
  'tms',
  'tms/taskflows/:taskFlowId/canvas',
  'tms/taskflows',
  'taskflow-canvas',
  'tms-taskflow-canvas-v2-example-moveto',
  'TMS Compose Example V2 - MoveTo',
  '["MoveTo", "이동", "경로", "A->B->C"]'::jsonb,
  $$
{
  "exampleInput": "충전 스테이션1->회의실A->리셉션 태스크플로우 구성해줘",
  "expectedTool": "compose_linear_taskflow",
  "expectedArgs": {
    "flowMode": "default",
    "steps": [
      { "label": "충전 스테이션1", "taskName": "MoveTo", "contentName": "충전 스테이션1" },
      { "label": "회의실A", "taskName": "MoveTo", "contentName": "회의실A" },
      { "label": "리셉션", "taskName": "MoveTo", "contentName": "리셉션" }
    ]
  },
  "notes": [
    "MoveTo task/content가 taskContents에 있을 때만 반영",
    "결과는 canvasDraft 우선 반환"
  ]
}
  $$,
  210,
  TRUE
),
(
  'tms',
  'tms/taskflows/:taskFlowId/canvas',
  'tms/taskflows',
  'taskflow-canvas',
  'tms-taskflow-canvas-v2-example-pickup',
  'TMS Compose Example V2 - PickUp',
  '["PickUp", "픽업", "집기", "수거", "적재"]'::jsonb,
  $$
{
  "exampleInput": "창고A에서 박스1 픽업하고 창고B에서 박스2 픽업하는 태스크플로우 구성해줘",
  "expectedTool": "compose_linear_taskflow",
  "expectedArgs": {
    "flowMode": "default",
    "steps": [
      { "label": "박스1", "taskName": "PickUp", "contentName": "박스1" },
      { "label": "박스2", "taskName": "PickUp", "contentName": "박스2" }
    ]
  },
  "notes": [
    "PickUp task가 flowDefinition/taskContents에 있어야 함",
    "매칭 실패 시 clarification 반환"
  ]
}
  $$,
  220,
  TRUE
),
(
  'tms',
  'tms/taskflows/:taskFlowId/canvas',
  'tms/taskflows',
  'taskflow-canvas',
  'tms-taskflow-canvas-v2-example-playmotion',
  'TMS Compose Example V2 - PlayMotion',
  '["PlayMotion", "모션", "동작", "제스처", "포즈"]'::jsonb,
  $$
{
  "exampleInput": "입장 모션 후 인사 모션을 재생하는 태스크플로우 구성해줘",
  "expectedTool": "compose_linear_taskflow",
  "expectedArgs": {
    "flowMode": "default",
    "steps": [
      { "label": "입장 모션", "taskName": "PlayMotion", "contentName": "입장 모션" },
      { "label": "인사 모션", "taskName": "PlayMotion", "contentName": "인사 모션" }
    ]
  },
  "notes": [
    "PlayMotion content가 taskContents에 있을 때만 반영",
    "없으면 임의 생성하지 않음"
  ]
}
  $$,
  230,
  TRUE
),
(
  'tms',
  'tms/taskflows/:taskFlowId/canvas',
  'tms/taskflows',
  'taskflow-canvas',
  'tms-taskflow-canvas-v2-example-mixed',
  'TMS Compose Example V2 - Mixed Tasks',
  '["MoveTo", "PickUp", "PlayMotion", "혼합", "mixed"]'::jsonb,
  $$
{
  "exampleInput": "회의실A로 이동 후 샘플박스 픽업하고 환영 모션 재생하는 태스크플로우 구성해줘",
  "expectedTool": "compose_linear_taskflow",
  "expectedArgs": {
    "flowMode": "default",
    "steps": [
      { "label": "회의실A", "taskName": "MoveTo", "contentName": "회의실A" },
      { "label": "샘플박스", "taskName": "PickUp", "contentName": "샘플박스" },
      { "label": "환영 모션", "taskName": "PlayMotion", "contentName": "환영 모션" }
    ]
  },
  "notes": [
    "단계별로 서로 다른 taskName 사용 가능",
    "각 step은 taskContents 매칭 성공 시에만 구성"
  ]
}
  $$,
  240,
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
