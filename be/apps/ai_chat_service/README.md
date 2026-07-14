# ai_chat_service

사이트 어시스턴트(챗봇) 백엔드. 프론트 화면(앱·탭)을 기준으로 사용자 발화를
**정보 문의 / 데이터 조회 / 액션 명령** 중 하나로 처리한다.

- LLM: **Azure OpenAI** (`chat/completions`, function tool-calling)
- 포트: `PORT_AI_CHAT_SERVICE`(기본 3007)
- 진입 API: `POST /chat/site-assistant`

---

## 1. 두 처리 경로

요청은 항상 **(A) pipeline 우선 → (B) guidance 폴백** 순서로 처리된다.

| 경로 | 대상 | 방식 |
|---|---|---|
| **(A) pipeline** | `screen-registry` 에 등록된 화면 | 인텐트 분류 → RAG/데이터/액션 |
| **(B) guidance** | 미등록 화면, 또는 (A) 예외 시 폴백 | 화면별 정적 안내 프롬프트(단일 LLM 호출) |

pipeline 의 3가지 인텐트:

| 인텐트 | 의미 | 처리 |
|---|---|---|
| `info` | 개념·용어·사용법 문의 | **RAG** 문서 검색 후 근거 기반 답변 |
| `data` | 건수·목록·통계 등 데이터 조회 | **데이터 tool-calling** → 필터 확정 + 요약 |
| `action` | 재부팅·조치 실행 등 즉시 수행 | **액션 tool-calling** → action_runner 실행 |

> tool 이 없는 화면(RAG 전용)은 data/action 이 나와도 info 로 수렴한다.

**멀티턴**: 프론트가 최근 대화(`history`, 최대 8턴)와 직전 적용 필터(`previousFilters`)를 함께 보낸다.
`history` 는 인텐트 분류·tool-calling·RAG 답변의 문맥으로 주입되어 "응", "심각도 높음만" 같은
후속 발화의 참조가 해소된다. data 인텐트는 `previousFilters` 를 기준으로 필터를 병합한다.

**설정 관리**: `chat/settings` 는 LLM Provider 뿐 아니라 DB 기반 프롬프트/화면 가이드/화면 툴/최근 채팅 내역을 함께 내려준다.
프론트의 AI Assistant 설정 화면은 이 응답을 그대로 사용해 문구 수정, 툴 활성화, 최근 대화 조회를 처리한다.

---

## 2. 요청 처리 흐름 (Flow)

```
POST /chat/site-assistant
  (message, currentApp, currentPath, accessToken,
   apiBaseUrl, eventAnalyzerUrl, configManagerUrl,
   history[], previousFilters, context{groupId,siteId,eventId})
      │
      ▼
controller/chat.controller  →  service/chat.service.handleChat
      │  routeKey = `${currentApp}::${currentPath}`
      │
      ├─(A) pipeline/chat.orchestrator.handle(routeKey)   ← screen-registry 등록 화면
      │        │
      │        ├─ intent.classifier            info | data | action  (저신뢰도→info)
      │        ├─ info   → rag/rag.service      [화면 컬렉션 → common → fallbackText]
      │        ├─ data   → agent/tool-agent     screens/* datatools → resolvedFilters+요약
      │        │                                → chat_action_param.filters (FE 표 동기화)
      │        └─ action → agent/tool-agent     screens/* actiontools → action_runner 실행
      │                                         → chat_action_param.executed
      │
      └─(B) guidance/<app>/<app>.guidance      ← 미등록 화면 / (A) 실패 폴백
               화면별 안내 프롬프트 → 단일 LLM 호출 (실패 시 fallbackText)
      ▼
{ chat_action, chat_action_param?, text }  →  db/chat_log 저장  →  응답
```

---

## 3. 디렉토리 구조 (역할별 · 화면 단위)

```
src/
├─ main.ts / app.module.ts              부트스트랩 · Nest 모듈
├─ controller/                          진입 API
│  ├─ chat.controller.ts                POST /chat/site-assistant
│  └─ health.controller.ts
├─ service/
│  ├─ chat.service.ts                   ★ 진입점: (A)pipeline → (B)guidance 폴백 + 로그
│  └─ health.service.ts
│
├─ pipeline/                            ★ (A) 인텐트 파이프라인 (등록 화면)
│  ├─ chat.orchestrator.ts              인텐트 분기 (info/data/action)
│  ├─ screen-registry.ts                routeKey → ScreenConfig (화면 능력 정의)
│  ├─ intent.classifier.ts              LLM 인텐트 분류
│  ├─ tool.type.ts                      tool 공용 계약(선언/실행기/컨텍스트)
│  ├─ pipeline.config.ts                파이프라인 설정(URL·튜닝값)
│  ├─ pipeline.types.ts                 ChatIntent / ChatReply / IntentResult
│  ├─ agent/tool-agent.ts               tool-calling 루프 (data/action 공용)
│  └─ rag/
│     ├─ rag.service.ts                 키워드 검색 + 근거 기반 답변(폴백체인)
│     └─ rag.docs.ts                    RAG 문서(common + 화면별 컬렉션)
│
├─ screens/                             ★ 화면 단위 능력 (pipeline tool 구현)
│  └─ robot/
│     ├─ ailog-event.datatools.ts       이벤트 조회 tool(query_events)
│     ├─ ailog-event.actiontools.ts     이벤트 액션 tool(list/run → action_runner)
│     └─ dashboard.datatools.ts         대시보드 조회 tool(미등록, 편입 대기)
│
├─ integrations/                        외부 서비스 클라이언트
│  ├─ robot-api.client.ts               robot 백엔드 · event_analyzer · config_manager
│  └─ event-summary.util.ts             이벤트 요약 집계
│
├─ guidance/                            ★ (B) 미등록 화면 정적 안내(폴백)
│  ├─ screen-instruction.type.ts        direct/llm 안내 응답 타입
│  ├─ guidance.util.ts                  키워드 매칭 안내 유틸
│  ├─ default-response.ts / common.prompt.ts
│  └─ <robot|ota|cms|tms>/              앱별 안내 라우팅(*.guidance.ts) + 화면별 프롬프트(*.prompt.ts)
│
├─ llm/azure/                           Azure OpenAI 클라이언트/설정/사용량
├─ llm/vertex/                          (Vertex Gemini, 보조)
└─ db/
   ├─ chat-log.*                        대화 로그(Postgres/typeorm)
   ├─ chat-prompt.*                     화면/툴/가이드 문구 저장소(Postgres/typeorm)
   ├─ chat-guidance.*                   guidance 섹션/예시/폴백 저장소
   ├─ chat-rag-doc.*                    RAG 문서 저장소
   ├─ chat-screen-tool.*                화면(routeKey)별 data/action 툴 활성화 저장소
   └─ prompt-store.service.ts           DB 캐시 + 설정 UI용 조회/수정 진입점
```

> 화면 단위 원칙: **화면의 pipeline 능력**은 `screens/<app>/<screen>.*tools.ts`,
> **RAG 문서**는 `pipeline/rag/rag.docs.ts` 의 해당 컬렉션,
> **guidance 안내**는 `guidance/<app>/<screen>.prompt.ts` 에 둔다.

---

## 4. 응답 계약 (프론트 연동)

```jsonc
{ "chat_action": "ailog/event/filter", "chat_action_param": { ... }, "text": "..." }
```

| chat_action | 언제 | chat_action_param | 프론트 동작 |
|---|---|---|---|
| `ailog/event` | 이벤트 탭 info | 없음 | 텍스트만 표시 |
| `ailog/event/filter` | 이벤트 탭 data | `{ filters: { startDate,endDate,severity,func,status,searchQuery } }` | 이벤트 표 필터 적용(`useAiLogEventStore`) |
| `ailog/event/action` | 이벤트 탭 action | `{ executed: { ok,eventId,key,result } }` | 실행 결과 표시 |
| `ailog/stats` 등 | 기타 AI로그 탭 info | 없음 | 텍스트만 표시 |
| `navigation` | 화면 이동 | `{ path }` | 라우팅 이동 |

> `filters` 키는 프론트 `useAiLogData` 필터 키와 동일하게 맞춰져 있다.
> `func` 는 기능 카탈로그(config_manager)의 func 명/tags 로 정규화되며,
> 매칭 실패 시 키워드 검색으로 폴백한다. `func: null` 은 드롭다운을 '전체'로 리셋.

---

## 5. 새 화면(탭) 추가하는 법

핵심: **`pipeline/screen-registry.ts` 에 ScreenConfig 하나를 추가**하면 pipeline(A)에 편입된다.

1. **정보(RAG)만 필요** — `pipeline/rag/rag.docs.ts` 에 컬렉션 추가 →
   `screen-registry` 에 `ragOnlyTab({ routeKey, screenName, ragCollection, chatAction, fallbackText })`.
2. **데이터 조회 필요** — `screens/<app>/<screen>.datatools.ts` 에 `ToolDefinition[]` 작성
   (조회는 `integrations/robot-api.client` 재사용, FE 동기화 필요 시 `resolvedFilters` 를 FE 필터 키와 동일하게 반환) →
   `screen-registry` 의 `dataTools`/`dataSystemPrompt`/`chatActions.data` 지정.
3. **액션 실행 필요** — `screens/<app>/<screen>.actiontools.ts` 작성(`ctx.actionRunnerUrl`) →
   `actionTools`/`actionSystemPrompt`/`chatActions.action` 지정.

> 참조 구현: `robot/ailog/event` (info+data+action 풀 예시).
> 미등록 화면 안내만 필요하면 `guidance/<app>/` 에 추가하고 `chat.service.buildInstruction` switch 에 연결.

### 설정 UI / DB 관리 API

`chat/settings` 는 아래 값을 반환한다.

- `schema`: 기존 채팅 설정 스키마
- `values`: 활성 LLM Provider 등 설정 값
- `management.prompts`: `chat_prompt` 목록
- `management.guidance`: `chat_guidance` 목록
- `management.screenTools`: `chat_screen_tool` 목록
- `management.history`: 최근 `chat_log` 목록

추가 수정 API:

- `PUT /chat/settings/prompts/:id`
- `PUT /chat/settings/guidance/:id`
- `PUT /chat/settings/screen-tools/:id`
- `GET /chat/settings/history?limit=20&currentApp=...`

런타임에서는 `screen-registry.ts`, `ailog-event.actiontools.ts`, `pipeline/rag/rag.service.ts` 가 `PromptStoreService` DB 값을 우선 사용하고, 값이 없으면 코드 기본값(`rag.docs.ts` 포함)으로 폴백한다.

> 참고: `chat_guidance` 는 현재 설정 조회/수정 관리용으로는 사용되지만, guidance(B) 런타임 응답 생성은 아직 `guidance/*` 코드 프롬프트를 사용한다.

---

## 6. 환경변수

| 변수 | 용도 | 기본 |
|---|---|---|
| `AZURE_OPENAI_ENDPOINT` / `_API_KEY` / `_DEPLOYMENT` / `_API_VERSION` | Azure OpenAI | — / — / gpt-5 / 2024-12-01-preview |
| `AZURE_OPENAI_MAX_TOKENS` | 최대 토큰 | 16384 |
| `ACTION_RUNNER_URL` | 액션 실행 서비스 | http://localhost:3004 |
| `CHAT_MAX_TOOL_TURNS` | tool 루프 한도 | 4 |
| `CHAT_RAG_TOP_K` | RAG 반환 청크 수 | 3 |
| `CHAT_INTENT_MIN_CONFIDENCE` | 이 미만이면 info 폴백 | 0.4 |
| `DB_URL_AI_CHAT_SERVICE` | 대화 로그 DB | — |
| `PORT_AI_CHAT_SERVICE` | 포트 | 3007 |

> `DB_URL_AI_CHAT_SERVICE` 하나로 `chat_log`, `chat_setting`, `chat_prompt`, `chat_guidance`, `chat_rag_doc`, `chat_screen_tool` 테이블을 함께 사용한다.

> robot/AI API 자격증명(`accessToken`)·엔드포인트(`apiBaseUrl`,`eventAnalyzerUrl`,`configManagerUrl`)와
> 화면 컨텍스트(`context`)는 **요청 바디**로 프론트에서 전달한다.

---

## 7. 확장 포인트

- **RAG 문서 업로드**: 현재 `rag.docs.ts`(TS 청크). 추후 파일 업로드→파싱→청킹→DB 저장 경로 추가 가능.
- **임베딩(pgvector)**: `rag.service` 의 키워드 `scoreChunk` 를 임베딩 유사도로 교체 시 정밀도 향상.
- **대시보드 편입**: `screens/robot/dashboard.datatools.ts` 를 `screen-registry` 에 등록하면 활성화.

---

## 8. DB 테이블/컬럼 사용처

아래는 `DB_SCHEMA_SAMPLE.sql` 기준으로, 각 테이블 컬럼이 코드에서 어떻게 쓰이는지 정리한 것이다.

### 8.1 `chat_setting`

| 컬럼 | 용도 | 사용 코드 |
|---|---|---|
| `id` | PK | TypeORM 내부 식별자 (`ChatSettingEntity`) |
| `key` | 설정 키 (`llmProvider` 등) | `ChatSettingService.get/upsert/getAll` |
| `value` | JSONB 설정 값 | `ChatSettingService.getLlmProvider`, `ChatSettingController.getAll/update` |
| `created_at` | 생성시각 | DB 기본값 관리(코드 직접 사용 없음) |
| `updated_at` | 수정시각 | `UpdateDateColumn` 자동 갱신 |

### 8.2 `chat_screen`

| 컬럼 | 용도 | 사용 코드 |
|---|---|---|
| `id` | PK | TypeORM 내부 식별자 |
| `app_key` | 앱 구분(common/robot/ota/cms/tms) | `PromptStoreService.listScreens` 정렬/노출 |
| `key` | 화면 키(예: `robot/ailog/event`) | `PromptStoreService.reload` 캐시 키 |
| `route_key` | 라우트 계층 키 | 설정 UI 데이터 표시/정렬 |
| `screen_name` | 화면 표시명 | 설정 UI 표시 |
| `depth` | 화면 뎁스 | 설정 UI 트리 표현 |
| `sort_order` | 정렬 순서 | `listScreens` 정렬 |
| `enabled` | 사용 여부 | 현재 설정 UI 표시용(런타임 직접 미사용) |
| `created_at` | 생성시각 | DB 기본값 관리(코드 직접 사용 없음) |
| `updated_at` | 수정시각 | `UpdateDateColumn` 자동 갱신 |

### 8.3 `chat_prompt`

| 컬럼 | 용도 | 사용 코드 |
|---|---|---|
| `id` | PK | `PUT /chat/settings/prompts/:id` 대상 |
| `app_key` | 앱 구분 | `listPrompts` 정렬/표시 |
| `key` | 프롬프트 소속 키 (`common`, `robot/ailog/event` 등) | `PromptStoreService.getPromptContent` 조회 키 |
| `route_key` | 라우트 계층 키 | 관리 화면 표시/정렬 |
| `category` | `common/screen/tool` 분류 | 관리 화면 표시 |
| `prompt_type` | `system`, `fallback`, `data-system`, `action-system`, `intent-hint`, `tool-description:*` | `screen-registry`, `ailog-event.actiontools` 조회 |
| `label` | 표시 라벨 | `updatePrompt` 수정 가능 |
| `content` | 실제 프롬프트 내용 | 런타임 프롬프트 본문 |
| `sort_order` | 정렬 | `listPrompts` 정렬 |
| `enabled` | 사용 여부 | `getPromptContent`에서 비활성 제외 |
| `created_at` | 생성시각 | DB 기본값 관리(코드 직접 사용 없음) |
| `updated_at` | 수정시각 | `UpdateDateColumn` 자동 갱신 |

### 8.4 `chat_guidance`

| 컬럼 | 용도 | 사용 코드 |
|---|---|---|
| `id` | PK | `PUT /chat/settings/guidance/:id` 대상 |
| `app_key` | 앱 구분 | `listGuidance` 정렬/표시 |
| `key` | guidance 키 | `PromptStoreService` 캐시 키 |
| `route_key` | 라우트 계층 키 | 관리 화면 표시/정렬 |
| `chat_action` | 응답 액션 식별자 | 현재 관리/표시용 |
| `screen_name` | 화면명 | `updateGuidance` 수정/표시 |
| `sections` | 섹션 JSON | `updateGuidance` 수정/표시 |
| `examples` | 예시 Q/A JSON | `updateGuidance` 수정/표시 |
| `fallback_text` | 폴백 문구 | `updateGuidance` 수정/표시 |
| `sort_order` | 정렬 | `listGuidance` 정렬 |
| `enabled` | 사용 여부 | `PromptStoreService.getGuidance` 비활성 제외 |
| `created_at` | 생성시각 | DB 기본값 관리(코드 직접 사용 없음) |
| `updated_at` | 수정시각 | `UpdateDateColumn` 자동 갱신 |

### 8.5 `chat_rag_doc`

| 컬럼 | 용도 | 사용 코드 |
|---|---|---|
| `id` | PK | `updateRagChunk` 대상(현재 컨트롤러 미노출) |
| `app_key` | 앱 구분 | `listRag` 정렬/표시 |
| `key` | 컬렉션 키(예: `robot/ailog/event`) | `RagService.resolveCollection` 조회 키 |
| `route_key` | 라우트 계층 키 | 관리 화면 표시/정렬 |
| `scope` | 컬렉션 표시 스코프 | RAG 답변 출처/문맥 |
| `chunk_key` | 청크 식별자 | 컬렉션 청크 ID |
| `title` | 청크 제목 | RAG 근거 제목 |
| `keywords` | 키워드 배열 | `scoreChunk` 가중치 계산 |
| `body` | 청크 본문 | RAG 검색/답변 근거 |
| `sort_order` | 정렬 | `listRag` 정렬 |
| `enabled` | 사용 여부 | `PromptStoreService.reload` 에서 비활성 제외 |
| `created_at` | 생성시각 | DB 기본값 관리(코드 직접 사용 없음) |
| `updated_at` | 수정시각 | `UpdateDateColumn` 자동 갱신 |

### 8.6 `chat_screen_tool`

| 컬럼 | 용도 | 사용 코드 |
|---|---|---|
| `id` | PK | `PUT /chat/settings/screen-tools/:id` 대상 |
| `app_key` | 앱 구분 | `listScreenTools` 정렬/표시 |
| `key` | 화면 키 | `isToolEnabled/getScreenTool` 조회 키 일부 |
| `route_key` | 라우트 키 | DB 유니크(`route_key`,`tool_name`) |
| `tool_name` | 툴 이름 | `isToolEnabled/getScreenTool` 조회 키 |
| `display_name` | 표시명 | `updateScreenTool` 수정/표시 |
| `kind` | `data/action` | 관리/표시 |
| `description` | 툴 설명 | 관리/표시 |
| `api_name` | 연동 API 명 | 관리/표시(동적 툴 확장 대비) |
| `method` | HTTP 메서드 | 관리/표시 |
| `endpoint` | API 경로 | 관리/표시 |
| `context_params` | 컨텍스트 파라미터 스키마 | 관리/표시 |
| `request_params` | 요청 파라미터 스키마 | 관리/표시 |
| `static_payload` | 고정 페이로드 | 관리/표시 |
| `sort_order` | 정렬 | `listScreenTools` 정렬 |
| `enabled` | 사용 여부 | `isToolEnabled` 런타임 분기 |
| `created_at` | 생성시각 | DB 기본값 관리(코드 직접 사용 없음) |
| `updated_at` | 수정시각 | `UpdateDateColumn` 자동 갱신 |

### 8.7 `chat_log`

| 컬럼 | 용도 | 사용 코드 |
|---|---|---|
| `id` | PK | 로그 식별자 |
| `current_app` | 요청 앱 | `ChatService.saveLog`, `ChatLogService.list(currentApp)` |
| `current_path` | 요청 화면 경로 | `ChatService.saveLog` |
| `chat_action` | 응답 액션 | `ChatService.saveLog` |
| `user_message` | 사용자 발화 | `ChatService.saveLog` |
| `assistant_text` | 어시스턴트 응답 | `ChatService.saveLog` |
| `created_at` | 생성시각 | `ChatLogService.list` 정렬(`DESC`) |
