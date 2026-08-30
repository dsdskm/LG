export const TASKFLOW_ROUTE_KEY = 'tms/taskflows/:taskFlowId/canvas'

export const TASKFLOW_RULE_GROUPS = [
    {
        id: 'language',
        prefix: 'taskflowLanguageRules',
        title: 'Taskflow Language Rules',
        description: 'A->B 구성해줘, 생성해줘, 연결해줘, 이어줘 같은 자연어 표현을 같은 흐름으로 해석하는 규칙입니다.',
        successLabel: 'Taskflow language rules',
        fields: [
            { key: 'composeNoisePhrases', label: '구성 잡음 제거 문구', kind: 'list', placeholder: '한 줄에 한 개씩 입력', helpText: '문장 해석 전에 제거할 배경 단어입니다. 예: 태스크플로우, 캔버스, taskflow' },
            { key: 'requestTailPhrases', label: '요청 꼬리말 문구', kind: 'list', placeholder: '한 줄에 한 개씩 입력', helpText: '화살표 경로 뒤에 붙는 요청 꼬리말입니다. 예: 구성해줘, 생성해줘, 연결해줘, 이어줘. A->B 뒤에서 제거됩니다.' },
            { key: 'composeVerbPhrases', label: '구성 동사 문구', kind: 'list', placeholder: '한 줄에 한 개씩 입력', helpText: '태스크플로우를 만들겠다는 의미의 동사들입니다. A->B 생성해줘, A->B 이어줘 같은 표현을 같은 구성 요청으로 묶습니다.' },
            { key: 'taskflowKeywordPhrases', label: 'taskflow 주제 문구', kind: 'list', placeholder: '한 줄에 한 개씩 입력', helpText: '태스크플로우 자체를 가리키는 핵심 단어들입니다. 화살표가 없는 일반 문장에서 구성 요청 판단에 사용됩니다.' },
            { key: 'composeSignalPhrases', label: '구성 신호 문구', kind: 'list', placeholder: '한 줄에 한 개씩 입력', helpText: '띄어쓰기나 특수문자가 섞여도 구성 요청으로 잡기 위한 축약 신호입니다. 예: taskflow구성' },
            { key: 'nodeLevelEditPhrases', label: '개별 노드 편집 문구', kind: 'list', placeholder: '한 줄에 한 개씩 입력', helpText: '전체 흐름이 아니라 개별 노드 추가/수정/삭제 요청으로 볼 문구들입니다.' },
            { key: 'nodePlaceholderPhrases', label: '일반 placeholder 노드명', kind: 'list', placeholder: '한 줄에 한 개씩 입력', helpText: '실제 노드명이 아니라 일반 표현으로 간주할 단어들입니다. 예: 노드, 작업, 단계' },
            { key: 'nodePlaceholderPrefixPhrases', label: '번호형 placeholder prefix', kind: 'list', placeholder: '한 줄에 한 개씩 입력', helpText: '노드1, task2처럼 번호만 붙은 일반 표현을 placeholder로 볼 때 쓰는 prefix입니다.' },
            { key: 'modeRequestPhrases', label: '모드 변경 요청 문구', kind: 'list', placeholder: '한 줄에 한 개씩 입력', helpText: '가로/세로 모드 변경을 요청하는 문구들입니다.' },
            { key: 'modeDirectionTreePhrases', label: '세로 모드 문구', kind: 'list', placeholder: '한 줄에 한 개씩 입력', helpText: '세로/tree 모드로 해석할 단어들입니다.' },
            { key: 'modeDirectionDefaultPhrases', label: '가로 모드 문구', kind: 'list', placeholder: '한 줄에 한 개씩 입력', helpText: '기본 가로/default 모드로 해석할 단어들입니다.' },
            { key: 'saveRequestPhrases', label: '저장 요청 문구', kind: 'list', placeholder: '한 줄에 한 개씩 입력', helpText: '저장 자체를 요청하는 문구들입니다.' },
            { key: 'saveDecisionHintPhrases', label: '저장 선택 유도 문구', kind: 'list', placeholder: '한 줄에 한 개씩 입력', helpText: '어떤 저장인지 다시 물어봐야 하는 문맥을 감지하는 단어들입니다.' },
            { key: 'saveTypeTempPhrases', label: '임시 저장 문구', kind: 'list', placeholder: '한 줄에 한 개씩 입력', helpText: '임시 저장으로 해석할 표현들입니다.' },
            { key: 'saveTypeFinalPhrases', label: '최종 저장 문구', kind: 'list', placeholder: '한 줄에 한 개씩 입력', helpText: '최종/정식 저장으로 해석할 표현들입니다.' },
            { key: 'resetAllPhrases', label: '전체 초기화 문구', kind: 'list', placeholder: '한 줄에 한 개씩 입력', helpText: '전체 태스크플로우를 초기화하거나 리셋하는 요청 문구입니다.' },
            { key: 'deleteRequestPhrases', label: '삭제 요청 문구', kind: 'list', placeholder: '한 줄에 한 개씩 입력', helpText: '삭제/제거/지우기 요청으로 볼 단어들입니다.' },
            { key: 'deleteAllScopePhrases', label: '전체 삭제 범위 문구', kind: 'list', placeholder: '한 줄에 한 개씩 입력', helpText: '전부, 전체, 모두처럼 삭제 범위가 전체인지 판별할 때 사용합니다.' },
            { key: 'alignRequestPhrases', label: '정렬 요청 문구', kind: 'list', placeholder: '한 줄에 한 개씩 입력', helpText: '배치/정렬 요청으로 해석할 표현들입니다.' },
            { key: 'moveComposeHintPhrases', label: '이동 흐름 힌트 문구', kind: 'list', placeholder: '한 줄에 한 개씩 입력', helpText: '이동 경로를 구성하라는 요청으로 볼 단어들입니다. 예: 이동, 거쳐, ->' },
            { key: 'pickupComposeHintPhrases', label: '픽업 흐름 힌트 문구', kind: 'list', placeholder: '한 줄에 한 개씩 입력', helpText: 'PickUp 계열 흐름으로 분기할 단어들입니다.' },
            { key: 'playMotionComposeHintPhrases', label: '모션 흐름 힌트 문구', kind: 'list', placeholder: '한 줄에 한 개씩 입력', helpText: 'PlayMotion 계열 흐름으로 분기할 단어들입니다.' },
            { key: 'docentHintPhrases', label: '도슨트 흐름 힌트 문구', kind: 'list', placeholder: '한 줄에 한 개씩 입력', helpText: '도슨트 시나리오로 분기할 단어들입니다.' },
            { key: 'connectIntentPhrases', label: '직접 연결 요청 문구', kind: 'list', placeholder: '한 줄에 한 개씩 입력', helpText: 'A와 B를 연결해줘처럼 연결 자체를 요청하는 문구입니다.' },
            { key: 'connectPairSeparatorPhrases', label: '연결 대상 구분 문구', kind: 'list', placeholder: '한 줄에 한 개씩 입력', helpText: 'A와 B처럼 연결 대상 둘을 나눌 때 쓰는 구분자입니다.' },
        ],
    },
    {
        id: 'classifier',
        prefix: 'taskflowClassifierRules',
        title: 'Taskflow Classifier Rules',
        description: 'taskflow compose/action/info 분기와 설명 이미지 기준을 제어합니다.',
        successLabel: 'Taskflow classifier rules',
        fields: [
            { key: 'explanationKeywords', label: '설명 키워드', kind: 'list', placeholder: '한 줄에 한 개씩 입력', helpText: '사용자 질문이나 답변에 이 단어들이 있으면 설명/가이드성 질문으로 더 강하게 인식합니다. 예: 설명, 사용법, 예시' },
            { key: 'composeRequestKeywords', label: '구성 요청 키워드', kind: 'list', placeholder: '한 줄에 한 개씩 입력', helpText: '태스크플로우를 만들어 달라는 요청으로 볼 단어들입니다. 예: 만들어 줘, 구성해 줘, 반영해 줘' },
            { key: 'composeMoveHintKeywords', label: '이동/화살표 힌트 키워드', kind: 'list', placeholder: '한 줄에 한 개씩 입력', helpText: '이동 경로나 화살표 체인을 의미하는 신호입니다. 구성 요청과 같이 있으면 action 쪽으로 기울게 됩니다.' },
            { key: 'editSubjectKeywords', label: '편집 주제 키워드', kind: 'list', placeholder: '한 줄에 한 개씩 입력', helpText: '문장이 taskflow 편집을 다루는지 판단할 때 보는 주제어입니다. 예: 노드, parallel, repeat, control' },
            { key: 'editVerbKeywords', label: '편집 동사 키워드', kind: 'list', placeholder: '한 줄에 한 개씩 입력', helpText: '실제 변경 요청인지 판단할 때 쓰는 동사들입니다. 예: 추가, 삭제, 수정, 저장, 연결' },
            { key: 'explanationBlockKeywords', label: '설명 차단 키워드', kind: 'list', placeholder: '한 줄에 한 개씩 입력', helpText: '이 문구가 있으면 편집 요청보다 설명 요청으로 우선 봅니다. 예: 어떻게 써, 뜻, 의미, 왜' },
            { key: 'arrowSequenceEnabled', label: '화살표 체인 강제 액션 전환', kind: 'boolean', helpText: '켜두면 A->B->C 같은 입력을 설명이 아니라 편집/action 요청으로 강하게 처리합니다.' },
            { key: 'explanationImageMinScore', label: '설명 이미지 최소 점수', kind: 'number', helpText: '설명용 이미지를 자동 첨부할 때 필요한 최소 점수입니다. 높을수록 더 엄격하게 붙습니다.' },
            { key: 'explanationImageMinScoreAlways', label: 'always 이미지 최소 점수', kind: 'number', helpText: 'image_attach_mode가 always인 문서에 적용되는 최소 점수입니다. 일반 기준보다 낮게 두는 경우가 많습니다.' },
        ],
    },
    {
        id: 'orchestrator',
        prefix: 'taskflowOrchestratorRules',
        title: 'Taskflow Orchestrator Rules',
        description: '멀티턴 clarification 복원과 가이드/info 강제 분기 규칙을 제어합니다.',
        successLabel: 'Taskflow orchestrator rules',
        fields: [
            { key: 'nodeClarificationPhrases', label: '노드 추가 clarification 감지 문구', kind: 'list', placeholder: '한 줄에 한 개씩 입력', helpText: '이전 AI 답변이 “어떤 노드를 추가할까요?” 같은 질문인지 판별하는 문구입니다.' },
            { key: 'nodeDeleteClarificationPhrases', label: '노드 삭제 clarification 감지 문구', kind: 'list', placeholder: '한 줄에 한 개씩 입력', helpText: '이전 AI 답변이 “어떤 노드를 삭제할까요?” 맥락인지 감지합니다.' },
            { key: 'modeClarificationPhrases', label: '모드 clarification 감지 문구', kind: 'list', placeholder: '한 줄에 한 개씩 입력', helpText: '가로/세로 모드를 다시 물어본 직후인지 판단할 때 사용합니다.' },
            { key: 'saveClarificationPhrases', label: '저장 clarification 감지 문구', kind: 'list', placeholder: '한 줄에 한 개씩 입력', helpText: '임시 저장인지 최종 저장인지 다시 물어본 상황을 감지합니다.' },
            { key: 'nodeNameBlockedPhrases', label: '단일 노드명 답변 차단 문구', kind: 'list', placeholder: '한 줄에 한 개씩 입력', helpText: '짧은 후속 답변이 단순 노드명이 아니라 다른 요청으로 보이면 자동 복원을 막습니다.' },
            { key: 'nodeNameOnlyMaxLength', label: '단일 노드명 최대 길이', kind: 'number', helpText: '이 길이 이하의 짧은 답변만 “노드 이름만 답한 것”으로 간주합니다.' },
            { key: 'nodeAppendSuffix', label: '노드 추가 suffix', kind: 'text', placeholder: '예: 추가해줘', helpText: '사용자가 노드명만 답했을 때 뒤에 붙여 완전한 요청 문장으로 복원하는 꼬리말입니다.' },
            { key: 'nodeAppendWithNodeSuffix', label: '노드 포함 추가 suffix', kind: 'text', placeholder: '예: 노드 추가해줘', helpText: '답변 안에 이미 노드라는 단어가 있을 때 붙이는 복원용 꼬리말입니다.' },
            { key: 'deleteAppendSuffix', label: '노드 삭제 suffix', kind: 'text', placeholder: '예: 지워줘', helpText: '삭제 clarification 다음에 온 짧은 답변을 삭제 요청 문장으로 복원할 때 붙입니다.' },
            { key: 'deleteAppendWithNodeSuffix', label: '노드 포함 삭제 suffix', kind: 'text', placeholder: '예: 노드 지워줘', helpText: '답변 안에 노드가 이미 포함된 삭제 후속 답변에 붙이는 꼬리말입니다.' },
            { key: 'modeAppendSuffix', label: '모드 변경 suffix', kind: 'text', placeholder: '예: 모드로 바꿔줘', helpText: '가로, 세로처럼 짧게 답했을 때 완전한 모드 변경 문장으로 복원합니다.' },
            { key: 'saveTempMessage', label: '임시 저장 복원 문장', kind: 'text', placeholder: '예: 태스크 플로우 임시 저장해줘', helpText: '저장 clarification 뒤에 사용자가 임시 저장 쪽을 선택했을 때 최종 실행 문장으로 사용합니다.' },
            { key: 'saveFinalMessage', label: '최종 저장 복원 문장', kind: 'text', placeholder: '예: 태스크 플로우 저장해줘', helpText: '저장 clarification 뒤에 사용자가 최종 저장 쪽을 선택했을 때 최종 실행 문장으로 사용합니다.' },
            { key: 'guideInfoCuePhrases', label: '가이드성 info 신호 문구', kind: 'list', placeholder: '한 줄에 한 개씩 입력', helpText: '방법, 설명, 원리처럼 정보성 질문으로 강제 분기할 단어들입니다.' },
            { key: 'guideActionCuePhrases', label: '가이드성 action 차단 문구', kind: 'list', placeholder: '한 줄에 한 개씩 입력', helpText: '설명처럼 보여도 실제 실행 요청이면 info 강제를 막기 위한 action 신호들입니다.' },
            { key: 'nodeGuideSubjectPhrases', label: '노드 가이드 주제 문구', kind: 'list', placeholder: '한 줄에 한 개씩 입력', helpText: '어떤 노드에 대한 설명인지 찾는 주제어입니다. 예: repeat, parallel, ifthenelse' },
            { key: 'nodeGuideRequestPhrases', label: '노드 가이드 요청 문구', kind: 'list', placeholder: '한 줄에 한 개씩 입력', helpText: '노드 사용법을 묻는 질문인지 판단하는 요청어입니다. 예: 사용법, 어떻게 써, 알려줘' },
        ],
    },
]

export const buildTaskflowSettingKey = (prefix, scope, fieldKey) => `${String(prefix ?? '').trim()}.${String(scope ?? '').trim()}.${String(fieldKey ?? '').trim()}`

export const toTaskflowRuleDraftValue = (kind, value) => {
    if (kind === 'list') {
        return Array.isArray(value)
            ? value.map((item) => String(item ?? '').trim()).filter(Boolean).join('\n')
            : ''
    }

    if (kind === 'boolean') {
        return String(Boolean(value))
    }

    if (value === undefined || value === null) return ''
    return String(value)
}

export const parseTaskflowRuleDraftValue = (kind, value) => {
    const raw = String(value ?? '').trim()

    if (kind === 'list') {
        return Array.from(new Set(raw.split(/\r?\n/).map((item) => item.trim()).filter(Boolean)))
    }

    if (kind === 'boolean') {
        return raw.toLowerCase() === 'true'
    }

    if (kind === 'number') {
        const parsed = Number(raw)
        return Number.isFinite(parsed) ? parsed : 0
    }

    return raw
}

export const isTaskflowCanvasRoute = (routeKey) => String(routeKey ?? '').trim() === TASKFLOW_ROUTE_KEY