# AI Chat Flow (TaskFlow Canvas 기준)

이 문서는 TaskFlow Canvas 화면에서 AI Assistant 요청이 처리되는 실제 런타임 흐름을 정리한다.

## 1. 프론트 컨텍스트 생성

1. 사용자가 Canvas 화면에서 메시지를 보낸다.
2. AI 패널이 현재 라우트가 Canvas인지 확인한다.
3. Canvas 페이지가 유지하는 런타임 컨텍스트(`window.__AI_TASKFLOW_CONTEXT__`)를 읽어 `flowContext`를 구성한다.
4. `taskList`와 함께 `taskContents`(task + content 조합 전체)를 포함한다.

관련 파일:
- `main/packages/ui/components/layout/AiAssistantPanel/index.jsx`
- `main/apps/tms/src/pages/TaskFlowCanvasPage/index.tsx`

## 2. API 요청 전송

`postSiteAssistantChat` 호출 시 `context`에 아래 데이터를 같이 전달한다.

- `groupId`, `siteId`
- `flowContext`
- `taskflow`

`flowContext/taskflow` 내부 핵심 필드:

- `taskFlowId`, `nodeCount`, `edgeCount`
- `currentNodeList`, `currentEdgeList`
- `flowDefinition`, `fullFlow`
- `taskList`
- `taskContents`

## 3. 백엔드 진입 및 화면/키 확정

1. Controller에서 요청 본문 및 key 관련 변수를 로그로 남긴다.
2. ChatService에서 `reqId`를 생성/재사용한다.
3. Route key를 우선순위(`key -> routeKey -> screenRouteKey -> currentApp/currentPath`)로 확정한다.
4. 등록 화면 여부를 확인 후 Orchestrator로 전달한다.

관련 파일:
- `be/apps/ai_chat_service/src/controller/chat.controller.ts`
- `be/apps/ai_chat_service/src/service/chat.service.ts`

## 4. 프롬프트 및 RAG 구성

1. ScreenRegistry가 `common + app/screen` 프롬프트를 병합한다.
2. 프롬프트 소스/원문/최종 병합 결과를 로그로 남긴다.
3. INFO 경로에서는 RAG 컬렉션 탐색, hit chunk, 최종 주입 프롬프트를 로그로 남긴다.

관련 파일:
- `be/apps/ai_chat_service/src/pipeline/screen-registry.ts`
- `be/apps/ai_chat_service/src/pipeline/rag/rag.service.ts`

## 5. Action 경로: compose_linear_taskflow

1. intent가 action이면 `compose_linear_taskflow` 도구를 실행한다.
2. 컨텍스트의 `taskContents`를 사용해 step을 보강한다.
3. `step.label` 기준으로 `taskContents.label/contentName`을 매칭한다.
4. 매칭되면 `taskName`, `taskId`, `contentName`, `contentId`를 step에 채운다.
5. 매칭 결과(hit/miss)를 로그로 남긴다.

관련 파일:
- `be/apps/ai_chat_service/src/pipeline/screen-registry.ts`

## 6. 응답 반환 및 프론트 반영

1. 백엔드가 `chat_action`, `chat_action_param(canvasDraft)`, `text`를 반환한다.
2. 프론트는 assistant 메시지를 표시한다.
3. `chat_action` 처리로 Canvas draft를 적용한다.
4. clarify 메시지가 필요한 경우 기존 assistant 메시지를 업데이트(덮어쓰기)하여 중복 출력을 방지한다.

관련 파일:
- `main/packages/ui/components/layout/AiAssistantPanel/index.jsx`
- `main/apps/tms/src/pages/TaskFlowCanvasPage/index.tsx`
- `main/packages/stores/src/useAiAssistantStore.js`

## 7. 로그 추적 포인트

동일 요청은 `reqId`로 묶어서 추적한다.

대표 로그:
- `[0단계:요청처리_진행상태] [reqId=...] ...`
- `[1단계:화면설정_프롬프트적용] [reqId=...] ...`
- `[2단계:컨텍스트수신_검증] [reqId=...] ... taskContentsCount=...`
- `[compose_linear_taskflow][taskContents-match] hit|miss ...`

## 8. 현재 기준 주의사항

- 표준 필드명은 `taskContents`를 사용한다.
- 하위 호환을 위해 백엔드는 `taskcontents`도 fallback으로 수용한다.
- Canvas 컨텍스트는 localStorage가 아니라 런타임 메모리 컨텍스트를 사용한다.
