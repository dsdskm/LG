# Taskflow Rule 정리

AI Chat Service의 룰은 DB(`ai_chat_service` DB의 `taskflow_rule` 테이블)에 저장되며, `routeKey`(화면/스코프 식별자)와 `ruleType`으로 구분됩니다.

---

## 룰 종류 (ruleType)

| ruleType | 레거시 접두어 | 역할 |
|---|---|---|
| `language` | `taskflowLanguageRules` | 입력 문장을 파싱하기 위한 문구 목록 |
| `classifier` | `taskflowClassifierRules` | 의도 분류 키워드 및 임계값 |
| `orchestrator` | `taskflowOrchestratorRules` | 어시스턴트 응답 문구, 동작 옵션 |

---

## 1. language 룰 — 입력 파싱용 문구

| ruleKey | 타입 | 설명 |
|---|---|---|
| `composeNoisePhrases` | string[] | 구성 명령에서 제거할 노이즈 문구 (예: "해줘", "으로") |
| `requestTailPhrases` | string[] | 문장 끝에 붙는 요청 꼬리 문구 (예: "추가해줘") |
| `composeVerbPhrases` | string[] | 구성 동사 문구 (예: "구성", "만들어") |
| `taskflowKeywordPhrases` | string[] | 태스크플로우 관련 키워드 (예: "taskflow", "태스크플로") |
| `composeSignalPhrases` | string[] | 구성 시작 시그널 문구 |
| `nodeLevelEditPhrases` | string[] | 노드 단위 편집 요청 문구 (예: "노드 추가", "단계 삭제") |
| `nodePlaceholderPhrases` | string[] | 노드명이 없는 자리표시자 문구 (예: "해당 노드", "이 단계") |
| `nodePlaceholderPrefixPhrases` | string[] | 자리표시자 앞에 붙는 접두어 문구 |
| `modeRequestPhrases` | string[] | 모드 변경 요청 문구 (예: "트리 모드로") |
| `modeDirectionTreePhrases` | string[] | 트리 방향 모드 지정 문구 |
| `modeDirectionDefaultPhrases` | string[] | 기본 방향 모드 지정 문구 |
| `saveRequestPhrases` | string[] | 저장 요청 문구 (예: "저장해줘") |
| `saveDecisionHintPhrases` | string[] | 저장 방식 선택 힌트 문구 |
| `saveTypeTempPhrases` | string[] | 임시 저장 선택 문구 |
| `saveTypeFinalPhrases` | string[] | 최종 저장 선택 문구 |
| `resetAllPhrases` | string[] | 전체 초기화 요청 문구 (예: "전부 지워줘") |
| `deleteRequestPhrases` | string[] | 노드 삭제 요청 문구 (예: "삭제해줘", "제거해줘") |
| `deleteAllScopePhrases` | string[] | 전체 삭제 범위 지정 문구 (예: "모두", "전체") |
| `alignRequestPhrases` | string[] | 정렬 요청 문구 (예: "정렬해줘") |
| `moveComposeHintPhrases` | string[] | 이동 동작 힌트 문구 (예: "이동", "옮겨") |
| `pickupComposeHintPhrases` | string[] | 피킹 동작 힌트 문구 (예: "집어", "픽업") |
| `playMotionComposeHintPhrases` | string[] | 모션 재생 힌트 문구 |
| `docentHintPhrases` | string[] | 도슨트(설명) 모드 힌트 문구 |
| `connectIntentPhrases` | string[] | 노드 연결 의도 문구 (예: "연결해줘", "이어줘") |
| `connectPairSeparatorPhrases` | string[] | 연결 쌍 구분자 (예: "->", "→") |
| `connectLeftPairSeparatorPhrases` | string[] | 왼쪽 방향 연결 구분자 (예: "=>") |

---

## 2. classifier 룰 — 의도 분류

| ruleKey | 타입 | 설명 |
|---|---|---|
| `explanationKeywords` | string[] | 설명 요청 의도 키워드 |
| `composeRequestKeywords` | string[] | 구성(편집) 요청 의도 키워드 |
| `composeMoveHintKeywords` | string[] | 이동 구성 힌트 키워드 |
| `editSubjectKeywords` | string[] | 편집 대상을 나타내는 키워드 |
| `editVerbKeywords` | string[] | 편집 동사 키워드 |
| `explanationBlockKeywords` | string[] | 설명 블록(무시)으로 처리할 키워드 |
| `arrowSequenceEnabled` | boolean | 화살표(`->`) 시퀀스 파싱 활성화 여부 |
| `explanationImageMinScore` | number | 설명 이미지 최소 매칭 점수 (기본: 5) |
| `explanationImageMinScoreAlways` | number | 항상 설명 이미지 적용 최소 점수 (기본: 1) |
| `nodeEditDeletePrefixes` | string[] | 삭제 의도 접두어 (기본: `["!"]`) |
| `nodeEditReplaceSeparators` | string[] | 교체 의도 구분자 (기본: `["="]`) |
| `arrowChainSeparators` | string[] | 화살표 체인 구분자 (기본: `["->", "→", "=>"]`) |

---

## 3. orchestrator 룰 — 응답 문구 및 동작 옵션

| ruleKey | 타입 | 설명 |
|---|---|---|
| `nodeClarificationPhrases` | string[] | 노드 추가 확인 요청 문구 |
| `nodeDeleteClarificationPhrases` | string[] | 노드 삭제 확인 요청 문구 |
| `modeClarificationPhrases` | string[] | 모드 변경 확인 요청 문구 |
| `saveClarificationPhrases` | string[] | 저장 확인 요청 문구 |
| `nodeNameBlockedPhrases` | string[] | 노드명으로 허용하지 않는 금지 문구 |
| `nodeNameOnlyMaxLength` | number | 노드명만으로 인식하는 최대 글자 수 (기본: 40) |
| `nodeAppendSuffix` | string | 노드 추가 성공 후 응답 접미사 |
| `nodeAppendWithNodeSuffix` | string | 노드명과 함께 쓰이는 추가 응답 접미사 |
| `deleteAppendSuffix` | string | 노드 삭제 성공 후 응답 접미사 |
| `deleteAppendWithNodeSuffix` | string | 노드명과 함께 쓰이는 삭제 응답 접미사 |
| `modeAppendSuffix` | string | 모드 변경 응답 접미사 |
| `saveTempMessage` | string | 임시 저장 완료 메시지 |
| `saveFinalMessage` | string | 최종 저장 완료 메시지 |
| `guideInfoCuePhrases` | string[] | 가이드 정보 큐 문구 |
| `guideActionCuePhrases` | string[] | 가이드 액션 큐 문구 |
| `nodeGuideSubjectPhrases` | string[] | 노드 가이드 주어 문구 |
| `nodeGuideRequestPhrases` | string[] | 노드 가이드 요청 문구 |
| `ruleFirstIntentConfidence` | number | 룰 기반 의도 신뢰도 임계값 (기본: 0.97) |
| `actionRetryDeleteExample` | string | 삭제 재시도 예시 문구 |
| `actionRetryConnectExample` | string | 연결 재시도 예시 문구 |
| `actionRetryComposeExample` | string | 구성 재시도 예시 문구 |
| `actionRetryDefaultExample` | string | 기본 재시도 예시 문구 |
| `actionRetryRunActionExample` | string | 액션 실행 재시도 예시 문구 |

---

## DB 저장 구조

```
ruleType    scopeKey      ruleKey                  valueJson
----------  ------------  -----------------------  ----------------------
language    tms           composeNoisePhrases      ["해줘", "으로"]
language    common        deleteRequestPhrases     ["삭제해줘", "제거"]
classifier  tms           arrowSequenceEnabled     true
orchestrator tms          nodeNameOnlyMaxLength    40
```

- `scopeKey`: 화면/서비스 단위 스코프. `common`은 전체 공통.
- `routeKey`가 `scopeKey`와 일치하는 룰이 우선 적용됨.
- 캐시 TTL: 10초 (서버 메모리 캐시).

---

## chat_setting을 통한 오버라이드

`language` 룰은 DB 룰 외에 `chat_setting` 테이블에서도 오버라이드 가능합니다.

키 형식:
```
taskflowLanguageRules.{scopeKey}.{ruleKey}
```

예:
```
taskflowLanguageRules.tms.deleteRequestPhrases = ["지워줘", "삭제"]
```

DB 룰과 chat_setting 룰이 모두 있을 때, chat_setting 값이 우선 적용됩니다.
