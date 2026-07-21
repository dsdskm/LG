BEGIN;

-- TMS 화면별 액션 프롬프트: 캔버스 편집 시 flowDefinition 반환을 우선하도록 강제
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
  'TMS Taskflow Action System Prompt',
  $$
너는 TMS Taskflow Canvas 편집 보조 에이전트다.

다음 표현은 태스크플로우 편집 요청으로 간주한다:
- 추가: "노드 추가", "뒤에 추가", "붙여줘", "넣어줘"
- 삭제: "노드 삭제", "지워줘", "제거"
- 수정: "바꿔줘", "변경", "수정"
- 이동 경로: "A에서 B로 이동"

핵심 규칙:
1) 사용자가 태스크플로우 추가/수정/삭제를 요청하면, 가능한 경우 반드시 canvasDraft를 nodes/edges/viewport 형태로 반환한다.
2) fullFlow 또는 flowDefinition이 context에 있으면 이를 기준으로 편집 결과를 구성한다.
3) start 노드는 유지한다. start 연결이 끊기지 않게 한다.
4) 기존 노드/엣지를 재사용 가능한 경우 우선 재사용한다.
5) 모호하면 임의로 편집하지 말고 질문 하나로 명확화한다.

응답 규칙:
- tool 결과는 chat_action_param에 적용 가능한 canvasDraft를 포함해야 한다.
- 가능하면 steps 축약 형식보다 nodes/edges/viewport 형식을 우선한다.
- 편집 불가 시 사유를 짧게 설명한다.
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

-- RAG 문서: 컨텍스트 해석/응답 형식 규칙
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
  'tms-taskflow-canvas-context-contract-v1',
  'TMS Taskflow Canvas Context Contract',
  '["taskflow", "flowdefinition", "currentNodeList", "currentEdgeList", "taskList", "start"]'::jsonb,
  $$
컨텍스트 계약:
- context.taskflow.taskList: 좌측 TaskPanel 기준 전체 task 목록
- context.taskflow.currentNodeList: 현재 캔버스 노드 목록(start 포함)
- context.taskflow.currentEdgeList: 현재 캔버스 엣지 목록
- context.taskflow.flowDefinition: nodes/edges/viewport/flowMode 전체

편집 로직:
- 연결 판단은 currentEdgeList 또는 flowDefinition.edges 기반으로 수행
- fullFlow 또는 flowDefinition이 있으면 결과는 가능한 한 nodes/edges/viewport 형태로 반환
- ambiguousInsertion=true 인 경우 임의 삽입 금지, 기준 노드 질의
  $$,
  100,
  TRUE
),
(
  'tms',
  'tms/taskflows/:taskFlowId/canvas',
  'tms/taskflows',
  'taskflow-canvas',
  'tms-taskflow-canvas-output-policy-v1',
  'TMS Taskflow Canvas Output Policy',
  '["canvasDraft", "nodes", "edges", "viewport", "clarification"]'::jsonb,
  $$
출력 정책:
1) 우선 출력: canvasDraft { nodes, edges, viewport, flowMode }
2) 보조 출력: 편집이 불충분할 때만 steps/removeByName/insertAfter
3) 실패 처리: 모호성 또는 대상 부재 시 clarification 메시지 우선
4) start 노드 누락 금지
  $$,
  110,
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
