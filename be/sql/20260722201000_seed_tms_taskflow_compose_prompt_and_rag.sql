BEGIN;

-- TMS 캔버스 액션 프롬프트를 '전체 흐름 구성' 중심으로 정리
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
  'TMS Taskflow Compose System Prompt',
  $$
너는 TMS Taskflow Canvas 구성 보조 에이전트다.

목표:
- 사용자의 자연어 흐름 요청을 Start 다음의 선형 태스크플로우로 구성한다.
- 개별 노드 추가/수정/삭제 편집 요청은 수행하지 않는다.
- 이동 중심 요청은 Parallel 시퀀스(각 단계: MoveTo + 선택적 Face/Sound) 형태를 우선 적용한다.
- 백엔드는 flowDefinition 규칙과 프론트가 준 taskContents 목록을 조합해서 canvasDraft를 만들어 반환한다.
- 예시 XML을 그대로 복제하는 것이 아니라, 실제 taskContents에 존재하는 task/content만 조립한다.
- "충전 스테이션1->회의실A->리셉션 태스크플로우 구성해줘" 계열은 아래 RAG의 canonical move-flow shape를 우선 참조한다.

의도 해석 규칙:
1) "A->B->C로 이동하는 태스크플로우 구성해줘" 같은 요청은 순서형 구성 요청으로 처리한다.
2) "A로 갔다가 B로 갔다가 C로" 같은 표현도 동일하게 A, B, C 순서를 추출한다.
3) 순서가 추출되면 각 단계를 MoveTo 기반 step으로 구성한다.
4) "이동 태스크 플로우 구성" 계열은 단계별 Parallel 노드를 만들고,
   - main 노드: MoveTo (필수)
   - 부가 노드: PlayFace, PlaySound (있으면 추가, 없으면 생략)
   로 처리한다.
5) 조립은 샘플 고정이 아니라 규칙 기반이다.
  - flowDefinition은 구조 규칙을 제공하고
  - taskContents는 실제 채울 수 있는 재료 목록이다.
  - 존재하지 않는 task/content는 절대 생성하지 않는다.

도구 호출 규칙 (compose_linear_taskflow):
- args.steps는 순서대로 채운다.
- 각 step 기본 형태:
  - { "label": "A", "taskName": "MoveTo", "contentName": "A" }
- flowMode가 명시되지 않으면 "default"를 우선한다.

예시:
- 사용자: "충전 스테이션1->회의실A->리셉션 태스크 플로우 구성해줘"
  - 단계별로 Parallel을 직렬로 연결하고, 각 Parallel의 main_nodes는 MoveTo만 포함한다.
  - failure_count 미지정 시 -1을 기본으로 사용한다.

응답 규칙:
- 가능하면 canvasDraft(nodes/edges/viewport) 반영 결과를 반환한다.
- 개별 편집류 요청은 "전체 흐름 구성으로 다시 요청"하도록 clarification을 반환한다.
- start 노드는 유지되어야 한다.
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

-- RAG: 흐름 구성 의도 해석 가이드
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
  'tms-taskflow-canvas-compose-intent-v1',
  'TMS Taskflow Compose Intent Guide',
  '["taskflow", "compose", "A->B->C", "MoveTo", "canvasDraft"]'::jsonb,
  $$
구성형 질의 처리 기준:
- "~태스크플로우 구성해줘", "~로 이동하는 흐름", "A->B->C"는 선형 구성 요청이다.
- 단계 추출 결과는 순서를 보존한다.
- 단계별 기본 매핑은 MoveTo를 사용한다.
- 개별 노드 편집(추가/수정/삭제)은 지원 범위에서 제외한다.
- 이동형 고급 구성은 Parallel 시퀀스를 사용할 수 있다.
- Parallel 단계 구성 규칙:
  - MoveTo가 있으면 main 노드로 사용
  - PlayFace/PlaySound는 taskContents에 존재할 때만 추가
  - MoveTo가 없으면 해당 단계는 구성에서 제외(단계 축소)
  - taskContents에 없는 task/content id를 임의로 채우지 않는다.
  - 완성된 예시 XML은 참고용일 뿐, 실제 결과는 flowDefinition/taskContents를 기준으로 재조립한다.

정규화 예시:
- "A로 갔다가 B로 갔다가 C로 가는 태스크플로우 구성해줘"
  -> steps: [A, B, C]
  -> mapped:
     {"label":"A","taskName":"MoveTo","contentName":"A"}
     {"label":"B","taskName":"MoveTo","contentName":"B"}
     {"label":"C","taskName":"MoveTo","contentName":"C"}
 - "충전 스테이션1->회의실A->리셉션 태스크플로우 구성해줘"
   -> flowDefinition/taskContents를 읽어 실제 가능한 task/content만 조립한다.
   -> 각 단계는 Parallel + MoveTo main_node로 구성하고, PlayFace/PlaySound는 있으면 추가한다.
  $$,
  120,
  TRUE
),
(
  'tms',
  'tms/taskflows/:taskFlowId/canvas',
  'tms/taskflows',
  'taskflow-canvas',
  'tms-taskflow-canvas-canonical-move-flow-v1',
  'TMS Taskflow Canonical Move Flow',
  '["canonical", "move-flow", "parallel", "bt xml", "flowdefinition", "충전 스테이션1", "회의실A", "리셉션"]'::jsonb,
  $$
{
  "exampleInput": "충전 스테이션1->회의실A->리셉션 태스크플로우 구성해줘",
  "intendedShape": "Start -> Parallel -> Parallel -> Parallel",
  "behaviorTreeXml": "<root BTCPP_format=\"4\">\n  <BehaviorTree ID=\"MainTree\">\n    <Sequence name=\"root_sequence\">\n      <Parallel name=\"parallel_Parallel\" success_count=\"1\" failure_count=\"-1\" node_id=\"1784687676296\">\n        <Action ID=\"MoveTo\" name=\"move_to\" poi_id=\"c93497bb-e494-4c6e-a468-fbd9912484b1\" node_id=\"1784687605724\"/>\n        <ForceSuccess>\n          <Action ID=\"PlayFace\" name=\"play_face\" face_id=\"601\" repeat_count=\"\" node_id=\"1784687683341\"/>\n        </ForceSuccess>\n        <ForceSuccess>\n          <Action ID=\"PlaySound\" name=\"play_sound\" sound_id=\"605\" repeat_count=\"1\" node_id=\"1784687689072\"/>\n        </ForceSuccess>\n      </Parallel>\n      <Parallel name=\"parallel_Parallel\" success_count=\"1\" failure_count=\"-1\" node_id=\"1784687840324\">\n        <Action ID=\"MoveTo\" name=\"move_to\" poi_id=\"03f3f744-7e64-4ada-b8fb-2091ce846723\" node_id=\"1784687861409\"/>\n        <ForceSuccess>\n          <Action ID=\"PlayFace\" name=\"play_face\" face_id=\"601\" repeat_count=\"\" node_id=\"1784687867834\"/>\n        </ForceSuccess>\n        <ForceSuccess>\n          <Action ID=\"PlaySound\" name=\"play_sound\" sound_id=\"605\" repeat_count=\"1\" node_id=\"1784687872676\"/>\n        </ForceSuccess>\n      </Parallel>\n      <Parallel name=\"parallel_Parallel\" success_count=\"1\" failure_count=\"-1\" node_id=\"1784687846178\">\n        <Action ID=\"MoveTo\" name=\"move_to\" poi_id=\"c67e083c-291c-4841-a07a-aa827a2f193b\" node_id=\"1784687934195\"/>\n        <ForceSuccess>\n          <Action ID=\"PlayFace\" name=\"play_face\" face_id=\"601\" repeat_count=\"\" node_id=\"1784687946496\"/>\n        </ForceSuccess>\n        <ForceSuccess>\n          <Action ID=\"PlaySound\" name=\"play_sound\" sound_id=\"605\" repeat_count=\"1\" node_id=\"1784687957744\"/>\n        </ForceSuccess>\n      </Parallel>\n    </Sequence>\n  </BehaviorTree>\n</root>",
  "flowDefinition": {
    "id": 34,
    "name": "kkh",
    "groupId": "rBEAAp1NGc2BnVDXCa8ACA",
    "siteId": "rBEAAp1NGc2BnVDYFR8ACg",
    "status": "ACTIVE",
    "version": 0,
    "tasks": [
      { "id": 39, "taskType": "ROOT", "name": "Start" },
      { "id": 29, "taskType": "ACTION", "name": "MoveTo" },
      { "id": 27, "taskType": "CONTROL", "name": "Parallel" },
      { "id": 30, "taskType": "ACTION", "name": "PlayFace" },
      { "id": 31, "taskType": "ACTION", "name": "PlaySound" }
    ],
    "contents": [
      { "id": 31, "contentTypeName": "POI", "name": "충전 스테이션 1" },
      { "id": 30, "contentTypeName": "POI", "name": "회의실 A" },
      { "id": 29, "contentTypeName": "POI", "name": "리셉션" },
      { "id": 601, "contentTypeName": "FACE:IMAGE", "name": "웃는얼굴" },
      { "id": 605, "contentTypeName": "BGM", "name": "이동" }
    ],
    "expectedRules": [
      "Each step is a Parallel node",
      "Parallel.success_count = 1",
      "Parallel.failure_count = -1",
      "Parallel.main_nodes contains only the MoveTo node",
      "PlayFace and PlaySound are added only if present in taskContents"
    ]
  }
}
  $$,
  121,
  TRUE
),
  (
    'tms',
    'tms/taskflows/:taskFlowId/canvas',
    'tms/taskflows',
    'taskflow-canvas',
    'tms-taskflow-canvas-move-parallel-policy-v1',
    'TMS Move Flow Parallel Policy',
    '["parallel", "move", "moveto", "playface", "playsound", "main_nodes"]'::jsonb,
    $$
  이동 태스크플로우 구성 정책:
  1) 사용자가 이동 경로(예: A->B->C, A에서 B를 거쳐 C로)를 요청하면 단계별 Parallel 시퀀스를 우선 구성한다.
  2) 각 Parallel의 기본 속성:
    - success_count: 1
    - failure_count: -1 (미지정 기본값)
    - main_nodes: MoveTo 노드 ID만 포함
  3) 데이터 소스 제한:
    - 실제 taskContents에 있는 task/content만 사용한다.
  4) 태스크 가용성 규칙:
    - MoveTo가 없으면 해당 단계를 생략한다.
    - PlayFace/PlaySound가 없으면 해당 보조 노드는 생략한다.
  5) 최종 연결:
    - Start -> Parallel1 -> Parallel2 -> ...
    - 각 Parallel에서 left branch로 자식 노드 연결
    $$,
    123,
    TRUE
  ),
(
  'tms',
  'tms/taskflows/:taskFlowId/canvas',
  'tms/taskflows',
  'taskflow-canvas',
  'tms-taskflow-canvas-output-policy-v1',
  'TMS Taskflow Canvas Output Policy',
  '["canvasDraft", "compose", "steps", "clarification", "start"]'::jsonb,
  $$
출력 정책:
1) 우선 출력: canvasDraft { nodes, edges, viewport, flowMode }
2) 단계 해석: 순서형 구성 요청은 steps를 MoveTo로 정규화해 반영
3) 제한 사항: 개별 노드 추가/수정/삭제 요청은 실행하지 않고 clarification 반환
4) 안정성: start 노드는 누락되면 안 되며, 연결은 순차적으로 유지
  $$,
  125,
  TRUE
),
(
  'tms',
  'tms/taskflows/:taskFlowId/canvas',
  'tms/taskflows',
  'taskflow-canvas',
  'tms-taskflow-canvas-compose-example-v1',
  'TMS Taskflow Compose Example',
  '["example", "taskflow", "steps", "compose_linear_taskflow"]'::jsonb,
  $$
{
  "exampleInput": "A->B->C로 이동하는 태스크플로우 구성해줘",
  "expectedTool": "compose_linear_taskflow",
  "expectedArgs": {
    "flowMode": "default",
    "steps": [
      { "label": "A", "taskName": "MoveTo", "contentName": "A" },
      { "label": "B", "taskName": "MoveTo", "contentName": "B" },
      { "label": "C", "taskName": "MoveTo", "contentName": "C" }
    ]
  },
  "notes": [
    "최종 반환은 canvasDraft(nodes/edges/viewport) 우선",
    "Start 노드는 유지",
    "개별 노드 편집 요청은 clarification 반환"
  ]
}
  $$,
  130,
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
