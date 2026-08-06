# AI Chat Runtime Flow

이 문서는 현재 코드 기준 AI Chat 처리 흐름을 요약합니다.

## 1. 요청 진입

1. 프론트에서 채팅 payload를 전송합니다.
2. 백엔드는 reqId, routeKey, 대화 히스토리 컨텍스트를 구성합니다.
3. 이후 rule-first와 orchestrator 순서로 처리합니다.

주요 코드
- be/apps/ai_chat_service/src/service/chat.service.ts

## 2. 처리 우선순위

요청 1건은 아래 순서로 처리됩니다.

1. front-rule 우선 처리
2. event-rule-first 직접 조회 처리
3. 화면 파이프라인(orchestrator) 처리
4. guidance 기본 안내 폴백

주요 코드
- be/apps/ai_chat_service/src/service/chat.service.ts

## 3. front-rule

1. routeKey별 DB 룰 매칭을 시도합니다.
2. info 룰이면 즉시 텍스트 응답을 생성합니다.
3. action 룰이면 지정 tool을 실행해 결과를 조립합니다.

특징
- 운영 중 룰 수정 반영이 빠릅니다.
- 성공하면 orchestrator를 타지 않고 즉시 응답합니다.

주요 코드
- be/apps/ai_chat_service/src/service/chat.service.ts

## 4. event-rule-first

1. AI Log 이벤트 질의를 phrase-map + event-rule로 먼저 매칭합니다.
2. 매칭되면 query_events tool을 직접 실행합니다.
3. 성공 시 ailog/event/filter 응답으로 종료합니다.

특징
- 오늘 이슈 보여줘 같은 질의를 LLM 이전에 처리합니다.
- 기간/필터/검색어 파라미터를 룰 데이터로 결정합니다.

주요 코드
- be/apps/ai_chat_service/src/service/chat.service.ts
- be/apps/ai_chat_service/src/domains/ai-log-event/event-rule-first.ts
- be/apps/ai_chat_service/src/db/query-phrase-map.repo.ts
- be/apps/ai_chat_service/src/db/event-rule.repo.ts

## 5. Orchestrator 화면 파이프라인

1. ScreenConfig를 로드합니다.
2. 필요 시 후속 발화를 continuation 문장으로 보정합니다.
3. intent를 info 또는 action으로 결정합니다.
4. info는 RAG 경로, action은 tool agent 경로로 처리합니다.
5. info에서 RAG 미충족이면 기본 LLM 폴백을 사용합니다.

주요 코드
- be/apps/ai_chat_service/src/pipeline/chat.orchestrator.ts
- be/apps/ai_chat_service/src/pipeline/intent.classifier.ts

## 6. Tool Context 및 외부 연동 URL

1. tool 실행 컨텍스트는 요청 body 값을 우선 사용합니다.
2. 누락 시 서버 환경변수 fallback 값을 사용합니다.
3. eventAnalyzerUrl이 최종 누락되면 query_events 실행 시 실패합니다.

주요 코드
- be/apps/ai_chat_service/src/pipeline/tool-context.util.ts
- be/apps/ai_chat_service/src/integrations/robot-api.client.ts

## 7. phrase-map과 event-rule 차이

1. phrase-map
- 정규화 문구 exact/contains 매칭
- 고정 문장 처리에 강함

2. event-rule
- 정규식 패턴 매칭
- 다양한 발화 변형 처리에 강함

권장 사용
- 고정 표현은 phrase-map
- 확장 표현은 event-rule

## 8. 응답 형식

백엔드는 아래 정보를 반환합니다.

1. chat_action
2. chat_action_param
3. text
4. pipelineTrace, pipelineConfidence, matchedRule 등 디버그 메타

프론트는 chat_action 기준으로 화면 반영(필터 적용, 이동, 액션 실행 등)을 수행합니다.

주요 코드
- main/packages/ui/components/layout/AiAssistantPanel/index.jsx

## 9. 운영 포인트

1. reqId 기준으로 단계 로그를 추적합니다.
2. rule-first와 orchestrator 로그를 분리해 진단합니다.
3. 정책은 코드 상수보다 DB 룰 데이터 중심으로 관리합니다.
