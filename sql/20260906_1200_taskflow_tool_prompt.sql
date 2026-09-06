-- ai_chat_service DB. taskflow 도구가 쓰던 하드코딩 문구를 prompt 테이블로 옮긴다.
-- 실행: docker exec -i ai-chat-service-pg psql -U root -d ai_chat_service_db < sql/20260906_1200_taskflow_tool_prompt.sql

INSERT INTO prompt_type (key, label, description, sort_order) VALUES
  ('tool-compose-taskflow', 'Tool: compose_linear_taskflow', 'compose_linear_taskflow 도구 설명. {{catalog}} {{concurrentRule}} {{alternativeRule}} 치환.', COALESCE((SELECT MAX(sort_order) FROM prompt_type), 0) + 1),
  ('tool-edit-taskflow', 'Tool: edit_taskflow', 'edit_taskflow 도구 설명. {{catalog}} 치환.', COALESCE((SELECT MAX(sort_order) FROM prompt_type), 0) + 2),
  ('tool-taskflow-message', 'Tool: taskflow 응답 문구', 'taskflow 도구가 채팅에 내보내는 문구 묶음. JSON 객체이며 값 안의 {{변수}} 가 치환된다.', COALESCE((SELECT MAX(sort_order) FROM prompt_type), 0) + 3),
  ('tool-read-taskflow-graph', 'Tool: read_taskflow_graph', 'read_taskflow_graph 도구 설명.', COALESCE((SELECT MAX(sort_order) FROM prompt_type), 0) + 4)
ON CONFLICT (key) DO UPDATE SET label = EXCLUDED.label, description = EXCLUDED.description;

INSERT INTO prompt (app_key, screen_key, type, prompt, enabled) VALUES (
  'tms',
  'tms/taskflows/:taskFlowId/canvas',
  'tool-compose-taskflow',
$$자연어 요청을 TaskFlow 로 구성한다. 노드를 preorder 순서로 나열하고 depth 로 부모-자식 관계를 표현한다.
이 도구는 캔버스를 전부 새로 그린다. 기존 노드를 일부만 추가/교체/삭제하려면 edit_taskflow 를 쓴다.
depth 0 노드는 여러 개 나열할 수 있고, 나열한 순서가 곧 실행 순서다. 순차 실행을 위해 별도의 Task 로 묶지 않는다.
자식은 부모보다 depth 가 정확히 1 커야 한다.
사용자가 지목한 대상(POI/TTS/모션/표정 이름)은 contentName 에 그대로 적는다.
사용자가 말한 대로만 적고 "장소", "지점", "노드" 같은 말을 임의로 붙이거나 빼지 않는다. 이름이 한 글자라도 다르면 서버가 못 찾는다.
어떤 Task 인지 모르고 대상 이름만 알면 taskName 을 빈 문자열로 두고 contentName 만 채운다. 서버가 Task 를 찾아준다.
taskName 을 쓸 때는 반드시 아래 목록의 이름을 그대로 사용한다.
{{concurrentRule}}
{{alternativeRule}}

[사용 가능한 Task]
{{catalog}}$$,
  true
)
ON CONFLICT (screen_key, type) DO UPDATE SET prompt = EXCLUDED.prompt, enabled = EXCLUDED.enabled;

INSERT INTO prompt (app_key, screen_key, type, prompt, enabled) VALUES (
  'tms',
  'tms/taskflows/:taskFlowId/canvas',
  'tool-taskflow-message',
$${
  "node.label": "{{contentName}}({{taskName}})",
  "graph.empty": "캔버스가 비어 있습니다.",
  "graph.children": "자식: {{nodes}}",
  "graph.next": "다음: {{nodes}}",

  "compose.done": "{{nodes}} 로 태스크플로우를 구성했습니다.",
  "compose.substituted": "가장 가까운 항목으로 대체했습니다: {{pairs}}",
  "compose.placeholders": "⚠️ 대상을 찾지 못해 임시로 채웠습니다. 노드에서 직접 바꿔 주세요: {{pairs}}",
  "compose.missing": "일부 노드는 찾을 수 없어 구성하지 않았습니다: {{names}}",
  "compose.unresolved": "대상을 확인하지 못해 빈 노드로 두었습니다: {{names}}",
  "compose.rootRequired": "첫 노드는 최상위여야 합니다. 요청을 조금 더 구체적으로 말씀해 주세요.",
  "compose.depthSkipped": "노드 계층이 건너뛰었습니다. 요청을 다시 말씀해 주세요.",
  "compose.parentMissing": "노드 계층을 해석하지 못했습니다. 요청을 다시 말씀해 주세요.",
  "compose.taskNotFound": "요청하신 동작을 사용할 수 있는 Task 에서 찾지 못했습니다.",
  "compose.emptyControl": "{{names}} 아래에 실행할 동작이 없습니다.",
  "compose.suggestionLimit": 3,
  "compose.taskJoiner": " 또는 ",
  "compose.concurrentRule": "\"~하면서\", \"동시에\" 처럼 같이 실행하는 동작은 {{tasks}} 의 자식으로 묶는다.",
  "compose.alternativeRule": "\"성공하면 A 실패하면 B\" 처럼 대안이 있는 경우는 {{tasks}} 의 자식으로 묶는다.",
  "compose.param.nodes": "preorder 로 나열한 노드 목록",
  "compose.param.depth": "최상위는 0, 자식은 부모 depth + 1",
  "compose.param.taskName": "카탈로그에 있는 Task 이름. 모를 때는 빈 문자열",
  "compose.param.contentName": "사용자가 지목한 콘텐츠 이름(POI/TTS/모션/표정 등)",

  "edit.done": "{{applied}} 했습니다.",
  "edit.placeholders": "⚠️ 대상을 찾지 못해 임시로 채웠습니다. 노드에서 직접 바꿔 주세요: {{pairs}}",
  "edit.missing": "일부 노드는 찾을 수 없어 반영하지 않았습니다: {{names}}",
  "edit.ambiguous": "어느 노드인지 알 수 없어 반영하지 않았습니다: {{names}}",
  "edit.emptyCanvas": "캔버스에 수정할 노드가 없습니다. 먼저 태스크플로우를 구성해 주세요.",
  "edit.ambiguousClarification": "같은 이름의 노드가 여러 개입니다. 몇 번째인지 말씀해 주시거나 \"모든\"이라고 말씀해 주세요: {{options}}",
  "edit.notFound": "요청하신 노드를 캔버스에서 찾지 못했습니다: {{names}}",
  "edit.appliedRemove": "{{node}} 삭제",
  "edit.appliedReplace": "{{node}} → {{label}} 교체",
  "edit.appliedClone": "{{node}} 복제",
  "edit.appliedAppend": "{{label}} 추가",
  "edit.appliedAppendAfter": "{{anchor}} 뒤에 {{label}} 추가",
  "edit.appliedAppendBranch": "{{anchor}} 아래에 {{label}} 추가",
  "edit.cloneTargetMissing": "복제할 노드",
  "edit.placeholderPair": "{{requested}} → {{label}}",
  "edit.ambiguousEntry": "{{name}} ({{options}})",
  "edit.param.operations": "요청한 순서대로 나열한 수정 작업",
  "edit.param.action": "insert, replace, remove, clone_all 중 하나",
  "edit.param.target": "replace/remove 대상이 되는 기존 노드 이름. 번호가 있으면 \"Joy #2\" 처럼 적는다",
  "edit.param.after": "insert 할 때 기준이 되는 기존 노드 이름. 번호가 있으면 \"Parallel #1\" 처럼 적는다",
  "edit.param.taskName": "새로 넣을 Task 이름. 모르면 빈 문자열",
  "edit.param.contentName": "새로 넣을 대상 이름(POI/TTS/모션/표정 등)",
  "edit.param.branch": "true 면 기준 노드의 자식으로 넣는다",
  "edit.param.all": "true 면 이름이 같은 모든 노드에 적용한다",
  "edit.param.refId": "이 operation 이 만드는 노드의 별칭. 뒤 operation 의 after 에 이 별칭을 적으면 바로 그 노드를 가리킨다"
}$$,
  true
)
ON CONFLICT (screen_key, type) DO UPDATE SET prompt = EXCLUDED.prompt, enabled = EXCLUDED.enabled;

INSERT INTO prompt (app_key, screen_key, type, prompt, enabled) VALUES (
  'tms',
  'tms/taskflows/:taskFlowId/canvas',
  'tool-read-taskflow-graph',
$$현재 캔버스에 놓여 있는 TaskFlow 구조를 읽는다.
기존 노드를 추가/교체/삭제하기 전에 먼저 호출해 실제 노드 이름을 확인한다.
플로우를 평가하거나 개선을 제안할 때도 먼저 호출한다.
이름이 겹치는 노드에는 " #번호" 가 붙어 나온다. 이 번호는 사용자 화면의 노드 배지와 같은 값이므로 지목할 때 그대로 쓴다.$$,
  true
)
ON CONFLICT (screen_key, type) DO UPDATE SET prompt = EXCLUDED.prompt, enabled = EXCLUDED.enabled;
