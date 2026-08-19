# AI Chat Flow (TaskFlow Canvas 현재 코드 기준)

이 문서는 TaskFlow Canvas에서 AI Assistant 요청이 처리되는 현재 런타임 흐름을 코드 기준으로 정리한다.

## 1. 프론트 컨텍스트 구성

1. 사용자가 Canvas에서 메시지를 전송한다.
2. 프론트가 Canvas 컨텍스트를 읽어 `flowContext`/`taskflow`를 요청 payload에 포함한다.
3. `taskContents`(task + content 매핑), `fullFlow`(nodes/edges/viewport/flowMode), `taskList`가 함께 전달된다.

주요 필드:
- `taskFlowId`, `nodeCount`, `edgeCount`
- `currentNodeList`, `currentEdgeList`
- `flowDefinition`, `fullFlow`
- `taskList`, `taskContents`

## 2. 백엔드 진입

1. Controller/Service가 요청을 수신한다.
2. `reqId`를 생성 또는 재사용한다.
3. route key를 확정해 pipeline으로 전달한다.

관련 파일:
- `be/apps/ai_chat_service/src/controller/chat.controller.ts`
- `be/apps/ai_chat_service/src/service/chat.service.ts`

## 3. Orchestrator 분기

1. `ChatOrchestrator`가 화면 설정(`ScreenConfig`)을 로드한다.
2. 멀티턴 보정(`buildContinuationMessage`)으로 clarification 후속 발화를 실행 가능한 문장으로 재작성할 수 있다.
3. intent classifier 결과 또는 fallback 키워드로 `info | action` 라벨을 확정한다.
4. 최종 처리 경로는 `info | action` 두 갈래다. (기존 `data` 분류는 action으로 통합 처리)
5. 경로별 처리:
	 - `info`: RAG 조회 -> RAG 미충족 시 기본 LLM 호출 -> 응답 생성
	 - `action`: 통합 액션 프롬프트 적용 -> 통합 액션 툴 실행
6. 액션 RAG는 향후 확장 포인트로 정의되어 있으며, 현재 런타임에는 기본 포함되지 않는다.

관련 파일:
- `be/apps/ai_chat_service/src/pipeline/chat.orchestrator.ts`

## 4. ScreenRegistry 및 Tool 등록

1. `screen-registry.ts`가 화면별 tool/프롬프트 구성을 관리한다.
2. TaskFlow Canvas action tool로 `compose_linear_taskflow`를 등록한다.
3. 최종 action 결과는 `chat_action`, `chat_action_param`, `text` 형태로 반환된다.

관련 파일:
- `be/apps/ai_chat_service/src/pipeline/screen-registry.ts`
- `be/apps/ai_chat_service/src/pipeline/screen-registry-tms-compose/index.ts`

## 5. compose_linear_taskflow 동작

### 5.1 컨텍스트/요청 전처리

- 의도 모호성 처리:
	- 모드 전환 모호: clarification
	- 저장 의도 모호: clarification
	- 노드 단건 편집 요청: clarification
- 삭제 요청(`isDeleteAllNodesMessage`): Start만 남기는 draft 반환
- 정렬/모드 전환 요청: 기존 fullFlow 기준 replace draft 반환

관련 파일:
- `be/apps/ai_chat_service/src/pipeline/screen-registry-tms-compose/index.ts`
- `be/apps/ai_chat_service/src/pipeline/screen-registry-tms-compose/domain/tms/intent.ts`

### 5.2 TMS 특화 도메인 분기

- PickUp 요청: `PickUp -> DoesObjectExist -> PutDown` 페어 구성
- PlayMotion 요청: `Parallel(PlayMotion main + Tts)` 구성
- Move 요청: `Parallel(MoveTo main + PlayFace/PlaySound)` 시퀀스 구성

관련 파일:
- `be/apps/ai_chat_service/src/pipeline/screen-registry-tms-compose/domain/tms/flow.ts`

### 5.3 일반 선형 구성

- `taskContents` 기반으로 step을 hydrate하고 미매칭 시 clarification 반환
- 현재 `fullFlow`가 존재하면 기존 그래프를 유지한 채 새 노드를 append
- append 기준:
	- Start만 있으면 Start에서 연결
	- 기존 노드가 있으면 현재 tail(종단) 노드에서 연결

관련 파일:
- `be/apps/ai_chat_service/src/pipeline/screen-registry-tms-compose/core/base.ts`

## 6. 최신 구조(폴더 정리 반영)

현재 compose 모듈은 아래처럼 폴더 단위로 분리되어 있다.

- `screen-registry-tms-compose/index.ts`: tool 엔트리
- `screen-registry-tms-compose/helpers.ts`: compose 의존 export 집합
- `screen-registry-tms-compose/core/`
	- `base.ts`: 선형 draft/flow context 핵심
	- `rag.ts`: RAG 템플릿 draft 처리
	- `index.ts`: core 통합 export
- `screen-registry-tms-compose/domain/`
	- `tms/intent.ts`: TMS compose 의도 판별
	- `tms/flow.ts`: TMS compose draft 생성
	- `tms/index.ts`: domain 통합 export

호환 shim(점진 이전용):
- `screen-registry-tms-compose/core.ts`
- `screen-registry-tms-compose/core-base.ts`
- `screen-registry-tms-compose/core-rag.ts`
- `screen-registry-tms-compose/domain-flow-tms.ts`
- `screen-registry-tms-compose/domain-intent-tms.ts`

## 7. 응답 및 프론트 반영

1. 백엔드가 assistant 텍스트와 action payload를 반환한다.
2. 프론트는 assistant 메시지를 표시하고 `chat_action`에 따라 Canvas draft를 적용한다.
3. clarification 연속 턴은 기존 assistant 문맥과 합쳐 처리한다.

관련 파일:
- `main/packages/ui/components/layout/AiAssistantPanel/index.jsx`
- `main/apps/tms/src/pages/TaskFlowCanvasPage/index.tsx`
- `main/packages/stores/src/useAiAssistantStore.js`

## 8. 운영/디버깅 포인트

- 모든 주요 단계 로그는 `reqId` 기준으로 추적한다.
- 대표 로그 패턴:
	- `[2단계:컨텍스트확인] [reqId=...] ...`
	- `[3단계:의도분기] [reqId=...] ...`
	- `[3단계:INFO처리_RAG응답] [reqId=...] ...`
	- `[3단계:ACTION처리_툴실행] [reqId=...] ...`
	- `[4단계:드래프트구성] [reqId=...] ...`
	- `[compose_linear_taskflow][taskContents-match] hit|miss ...`

## 9. 주의사항

- 표준 필드명은 `taskContents`를 사용한다.
- 하위 호환으로 `taskcontents`도 fallback 수용한다.
- Canvas 흐름 생성은 `fullFlow`가 있으면 replace가 아니라 기존 그래프 유지 + append 규칙을 따른다.

## 10. Mermaid Flow

```mermaid
flowchart TD
	U[User Message on TaskFlow Canvas] --> F1[Frontend builds flowContext/taskflow]
	F1 --> API[POST /chat with context]

	API --> B1[chat.controller.ts]
	B1 --> B2[chat.service.ts\nresolve reqId + route key]
	B2 --> O[chat.orchestrator.ts]

	O --> C1[Load ScreenConfig + Prompt]
	C1 --> C2[Continuation rewrite\nbuildContinuationMessage]
	C2 --> C3{Intent Route}

	C3 -->|info| I1[RAG lookup]
	I1 --> I2{RAG satisfied?}
	I2 -->|yes| I3[RAG-grounded answer]
	I2 -->|no| I4[Default LLM fallback]
	I3 --> R
	I4 --> R

	C3 -->|data/action| A0[Action unified route]
	A0 --> A00[Unified action prompt]
	A00 --> AR[Action RAG - future extension]
	AR --> A[compose_linear_taskflow / integrated tools]

	A --> A1{Compose Branch}
	A1 -->|PickUp| P1[PickUp->DoesObjectExist->PutDown]
	A1 -->|PlayMotion| P2[Parallel(PlayMotion + Tts)]
	A1 -->|Move| P3[Parallel(MoveTo + PlayFace/PlaySound)]
	A1 -->|General| P4[Linear steps by taskContents]

	P1 --> APP[Append policy\nStart-only: connect from Start\nElse: connect from tail node]
	P2 --> APP
	P3 --> APP
	P4 --> APP

	R[Assistant response]
	APP --> R

	R --> FE[Frontend applies chat_action/chat_action_param]
	FE --> CANVAS[Canvas draft updated]
```
