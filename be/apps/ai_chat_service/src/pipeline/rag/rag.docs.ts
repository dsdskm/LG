/**
 * RAG 문서 저장소 (키워드 기반).
 *
 * 임베딩 없이 앱/화면별 문서를 청크 단위로 보관하고 키워드 점수로 검색한다.
 * 문서는 TS 모듈로 관리해 별도 빌드 asset 설정 없이 배포된다.
 * 나중에 pgvector 로 승격 시, 이 청크 구조를 그대로 임베딩하면 된다.
 */

export type RagChunk = {
  id: string
  title: string
  /** 검색 가중치를 높일 핵심 키워드. */
  keywords: string[]
  body: string
}

export type RagCollection = {
  /** 컬렉션 키. tab-registry 의 ragCollection 과 매칭. */
  name: string
  /** 이 지식이 다루는 화면/주제. 답변 톤 안내에 사용. */
  scope: string
  chunks: RagChunk[]
}

/** robot > AI 로그 분석 > 이벤트 탭 지식. */
const ROBOT_AILOG_EVENT: RagCollection = {
  name: 'robot/ailog/event',
  scope: '로봇 관리 > AI 로그 분석 > 이벤트',
  chunks: [
    {
      id: 'event-what',
      title: 'AI 이벤트란',
      keywords: ['이벤트', '이벤트가 뭐', 'ai 로그', '로그', '무엇', '정의', '개념'],
      body:
        'AI 이벤트는 로봇에서 발생한 이상 징후나 오류를 AI가 분석해 남긴 로그 1건을 말한다. ' +
        '각 이벤트는 발생 시간, 로봇 정보, 심각도(severity), 분석 상태, 요약/원인/추천 조치를 가진다. ' +
        '이벤트 탭에서는 이 로그 목록을 조회하고, 검색/필터하고, 추천 조치를 확인할 수 있다.',
    },
    {
      id: 'event-severity',
      title: '심각도(등급) 기준',
      keywords: ['심각도', '등급', '레벨', 'severity', 'critical', 'high', 'medium', 'middle', 'low', '치명', '높음', '보통', '낮음'],
      body:
        '심각도는 Critical, High, Middle(Medium), Low 4단계다. ' +
        'Critical은 로봇 운영을 즉시 중단시킬 수 있는 치명적 문제, High는 기능 장애를 유발하는 높은 위험, ' +
        'Middle은 주의가 필요한 보통 수준, Low는 경미한 참고성 로그다. ' +
        '심각도가 높을수록 우선 조치가 필요하다.',
    },
    {
      id: 'event-status',
      title: '분석/조치 상태',
      keywords: ['상태', '분석 상태', '조치', '조치 완료', '분석 완료', '분석 실패', '미처리', 'status', '완료', '실패'],
      body:
        '이벤트는 분석 상태와 조치 상태를 가진다. 분석 완료는 AI 분석이 끝나 요약/원인/추천 조치가 채워진 상태, ' +
        '분석 실패는 분석 중 오류가 난 상태다. 조치 완료는 추천 조치가 실행되어 이슈가 해소 처리된 상태다.',
    },
    {
      id: 'event-search',
      title: '검색 및 필터 사용법',
      keywords: ['검색', '필터', '조회', '기간', '날짜', '로봇별', '기능별', '레벨', '어떻게', '사용법', '찾아'],
      body:
        '검색 및 필터 영역에서 기간(오늘/최근 일주일/한 달 등), 로봇, 기능(func), 심각도, 상태로 이벤트를 좁혀 볼 수 있다. ' +
        '챗봇에게 "오늘 Critical 이벤트 보여줘"처럼 말하면 해당 조건으로 필터가 적용된다.',
    },
    {
      id: 'event-action',
      title: '추천 조치(Action)',
      keywords: ['추천', '조치', '액션', 'action', '해결', '처리 방법', '재부팅', '자동', '실행'],
      body:
        '분석이 완료된 이벤트에는 원인에 맞는 추천 조치가 제시된다. 예: 주행 오류 시 내비게이션 재시작, 통신 끊김 시 재접속. ' +
        '챗봇에게 "이 이벤트 조치 실행해줘"라고 하면 추천 조치를 즉시 실행할 수 있다. 실행되면 해당 이벤트는 조치 완료로 전이된다.',
    },
  ],
}

/** 전체 공통 RAG. 탭별 컬렉션에서 못 찾을 때 참조하는 사이트 공통 지식. */
export const COMMON_COLLECTION = 'common'

const COMMON: RagCollection = {
  name: COMMON_COLLECTION,
  scope: '로봇 관제 사이트 공통',
  chunks: [
    {
      id: 'site-overview',
      title: '사이트 구성',
      keywords: ['사이트', '구성', '메뉴', '뭘 할 수', '기능', '무엇', '앱', '전체'],
      body:
        '이 사이트는 로봇 관제 사이트다. 로봇 관리, S/W 배포, 콘텐츠 관리, TMS, 학습으로 구성된다. ' +
        '로봇 관리는 로봇 상태 모니터링/제어와 AI 이슈 분석, S/W 배포는 로봇 소프트웨어 관리, ' +
        '콘텐츠 관리는 로봇용 콘텐츠 관리, TMS는 로봇 작업 관리, 학습은 로봇 작업 학습을 담당한다.',
    },
    {
      id: 'navigation',
      title: '화면 이동',
      keywords: ['이동', '화면 이동', '가줘', '이동해', '열어', '보여줘 화면'],
      body:
        '"OO 화면으로 이동해줘"처럼 요청하면 해당 화면으로 이동한다. 예: "TMS 화면으로 이동해줘".',
    },
    {
      id: 'ailog-overview',
      title: 'AI 로그 분석 구성',
      keywords: ['ai 로그 분석', '탭', '구성', 'ai 로그', '분석'],
      body:
        'AI 로그 분석은 이벤트, 통계, 기능별, 담당자, 리포트, 프롬프트 탭으로 구성된다. ' +
        '이벤트는 로그 목록/조치, 통계는 발생 현황, 기능별은 기능 단위 분석, 담당자는 처리 배정, ' +
        '리포트는 분석 보고서, 프롬프트는 분석 프롬프트 설정을 다룬다.',
    },
  ],
}

/** robot > AI 로그 분석 > 통계 탭. */
const ROBOT_AILOG_STATS: RagCollection = {
  name: 'robot/ailog/stats',
  scope: '로봇 관리 > AI 로그 분석 > 통계',
  chunks: [
    {
      id: 'stats-overview',
      title: 'AI 로그 통계',
      keywords: ['통계', '현황', '건수', '지표', '발생 건수', '처리 상태', '요약'],
      body:
        '통계 화면은 AI 로그 발생 건수, 처리 상태, 주요 지표를 보여준다. ' +
        '기간별 추이(일별/주별/월별)와 유형별 현황, 많이 발생한 문제 순위(TOP)를 확인할 수 있다.',
    },
    {
      id: 'stats-trend',
      title: '기간별 추이 / 순위',
      keywords: ['기간별', '추이', '그래프', '일별', '주별', '월별', '유형별', 'top', '순위', '가장 많이'],
      body:
        '기간별 추이는 시간에 따른 로그 발생 변화를 그래프로 보여주고, ' +
        '유형별 현황과 TOP 순위로 어떤 문제가 가장 많이 발생했는지 파악할 수 있다.',
    },
  ],
}

/** robot > AI 로그 분석 > 기능별 탭. */
const ROBOT_AILOG_FUNC: RagCollection = {
  name: 'robot/ailog/func',
  scope: '로봇 관리 > AI 로그 분석 > 기능별',
  chunks: [
    {
      id: 'func-overview',
      title: '기능별 분석',
      keywords: ['기능별', '기능', '모듈', '함수', 'func', '분석 결과', '성공', '실패', '오류'],
      body:
        '기능별 화면은 AI 기능/모듈 단위로 로그와 성공·실패, 오류, 분석 결과를 보여준다. ' +
        '어떤 기능에서 문제가 많이 발생하는지 기능 단위로 파악한다.',
    },
    {
      id: 'func-examples',
      title: '주요 기능',
      keywords: ['주행', 'navigation', 'navi', 'bsp', '보드', '서비스'],
      body:
        '대표 기능으로 주행(navigation), BSP(보드) 등이 있다. ' +
        '"주행 문제 많이 발생해?"처럼 특정 기능의 분석 결과를 물을 수 있다.',
    },
  ],
}

/** robot > AI 로그 분석 > 담당자 탭. */
const ROBOT_AILOG_ASSIGNEES: RagCollection = {
  name: 'robot/ailog/assignees',
  scope: '로봇 관리 > AI 로그 분석 > 담당자',
  chunks: [
    {
      id: 'assignees-overview',
      title: '담당자 현황',
      keywords: ['담당자', '담당자별', '처리자', 'assignee', '할당', '배정', '처리', '누가', '미처리', '완료'],
      body:
        '담당자 화면은 AI 로그의 담당자 배정과 처리 진행 상태(미처리/처리중/완료)를 보여준다. ' +
        '담당자별 처리 현황과 누가 어떤 로그를 처리해야 하는지 확인할 수 있다.',
    },
  ],
}

/** robot > AI 로그 분석 > 리포트 탭. */
const ROBOT_AILOG_REPORT: RagCollection = {
  name: 'robot/ailog/report',
  scope: '로봇 관리 > AI 로그 분석 > 리포트',
  chunks: [
    {
      id: 'report-overview',
      title: 'AI 로그 리포트',
      keywords: ['리포트', '보고서', 'report', '요약 보고서', '분석 리포트', '다운로드', '내보내기', 'export', '저장'],
      body:
        '리포트 화면은 AI 로그 분석 결과를 요약한 보고서를 제공한다. ' +
        '리포트를 생성하고 다운로드/내보내기 할 수 있다.',
    },
  ],
}

/** robot > AI 로그 분석 > 프롬프트 탭. */
const ROBOT_AILOG_PROMPT: RagCollection = {
  name: 'robot/ailog/prompt',
  scope: '로봇 관리 > AI 로그 분석 > 프롬프트',
  chunks: [
    {
      id: 'prompt-overview',
      title: '프롬프트 관리',
      keywords: ['프롬프트', 'prompt', '프롬프트 목록', '프롬프트 설정', '설정', '수정', '역할', '규칙', '테스트', '검증'],
      body:
        '프롬프트 화면은 AI 로그 분석에 쓰는 프롬프트 목록을 관리하고, 설정/수정/테스트한다. ' +
        '프롬프트는 분석의 역할과 규칙을 정의하며, 테스트로 적용 결과를 검증할 수 있다.',
    },
    {
      id: 'prompt-common-vs-func',
      title: '공통 / 기능별 프롬프트',
      keywords: ['공통', '기능별', '차이', '공통 prompt', '기능별 prompt'],
      body:
        '프롬프트는 모든 분석에 적용되는 공통 프롬프트와, 특정 기능에만 적용되는 기능별 프롬프트로 나뉜다. ' +
        '공통은 전반 규칙을, 기능별은 해당 기능 특화 지침을 담는다.',
    },
  ],
}

const COLLECTIONS: Record<string, RagCollection> = {
  [COMMON.name]: COMMON,
  [ROBOT_AILOG_EVENT.name]: ROBOT_AILOG_EVENT,
  [ROBOT_AILOG_STATS.name]: ROBOT_AILOG_STATS,
  [ROBOT_AILOG_FUNC.name]: ROBOT_AILOG_FUNC,
  [ROBOT_AILOG_ASSIGNEES.name]: ROBOT_AILOG_ASSIGNEES,
  [ROBOT_AILOG_REPORT.name]: ROBOT_AILOG_REPORT,
  [ROBOT_AILOG_PROMPT.name]: ROBOT_AILOG_PROMPT,
}

export function getCollection(name: string): RagCollection | undefined {
  return COLLECTIONS[name]
}
