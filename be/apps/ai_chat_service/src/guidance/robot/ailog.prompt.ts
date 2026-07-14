/** [guidance/B] robot AI 로그 분석 각 탭의 안내 프롬프트 빌더. */
import {
  buildGuidanceAnswer,
  type GuidanceExample,
  type GuidanceSection,
} from '../guidance.util'

export type AilogChatAction =
  | 'ailog'
  | 'ailog/stats'
  | 'ailog/func'
  | 'ailog/assignees'
  | 'ailog/report'
  | 'ailog/prompt'

const AILOG_EVENT_SECTIONS: GuidanceSection[] = [
  {
    name: 'AI 로그 목록',
    desc: '로봇에서 발생한 AI 관련 로그 목록, 이벤트, 이력, 상세 내용, 분석 결과를 확인하는 영역',
    keywords: [
      'ai 로그',
      '로그',
      '목록',
      '이력',
      '내역',
      '이벤트',
      '발생',
      '상세',
      '상세정보',
      '상세 정보',
      '발생 시간',
      '로봇 정보',
      '분석 결과',
      '요약',
    ],
  },
  {
    name: '검색 및 필터',
    desc: '기간, 로봇, 로그 유형, 레벨, 상태, 기능 등을 기준으로 AI 로그를 검색하거나 필터링하는 영역',
    keywords: [
      '검색',
      '필터',
      '찾아',
      '조회',
      '기간',
      '날짜',
      '오늘',
      '최근',
      '일주일',
      '한달',
      '로봇',
      '로봇별',
      '유형',
      '레벨',
      'critical',
      'high',
      'medium',
      'low',
      '상태',
      '기능',
      '기능별',
    ],
  },
  {
    name: '추천 Action',
    desc: 'AI 로그 분석 결과에 따른 추천 조치, 처리 방법, 해결 방법을 확인하는 영역',
    keywords: [
      '액션',
      'action',
      '추천',
      '추천 action',
      '추천 액션',
      '조치',
      '조치 방법',
      '처리 방법',
      '해결',
      '해결 방법',
      '어떻게 처리',
      '어떻게 조치',
      '재부팅',
      '종료',
      '오프',
      'off',
      '자동 처리',
      '자동화',
    ],
  },
]

const AILOG_STATS_SECTIONS: GuidanceSection[] = [
  {
    name: '통계 현황',
    desc: 'AI 로그 발생 건수, 처리 상태, 주요 지표, 기간별 추이, 유형별 현황을 확인하는 영역',
    keywords: [
      '통계',
      '현황',
      '요약',
      '건수',
      '지표',
      '발생 건수',
      '처리 상태',
      '기간별',
      '추이',
      '일별',
      '주별',
      '월별',
      '그래프',
      '유형별',
      '분류',
      '많이',
      '가장',
      'top',
      'top10',
      '순위',
    ],
  },
]

const AILOG_FUNC_SECTIONS: GuidanceSection[] = [
  {
    name: '기능별 분석',
    desc: 'AI 기능 또는 모듈별 로그, 성공/실패, 오류, 분석 결과를 확인하는 영역',
    keywords: [
      '기능',
      '기능별',
      '모듈',
      '함수',
      'func',
      '분석',
      '분석 결과',
      '성공',
      '실패',
      '오류',
      '에러',
      '주행',
      'navigation',
      'navi',
      'bsp',
      '서비스',
    ],
  },
]

const AILOG_ASSIGNEES_SECTIONS: GuidanceSection[] = [
  {
    name: '담당자 현황',
    desc: 'AI 로그 담당자, 할당, 배정, 처리 진행 상태를 확인하는 영역',
    keywords: [
      '담당자',
      '담당자별',
      '처리자',
      'assignee',
      'assignees',
      '할당',
      '배정',
      '처리',
      '처리중',
      '미처리',
      '완료',
      '누가',
      '담당',
    ],
  },
]

const AILOG_REPORT_SECTIONS: GuidanceSection[] = [
  {
    name: '리포트',
    desc: 'AI 로그 분석 리포트, 요약 보고서, 다운로드, 내보내기를 확인하는 영역',
    keywords: [
      '리포트',
      '보고서',
      'report',
      '요약 보고서',
      '분석 리포트',
      '다운로드',
      '내보내기',
      'export',
      '저장',
      '생성',
      '정리',
    ],
  },
]

const AILOG_PROMPT_SECTIONS: GuidanceSection[] = [
  {
    name: '프롬프트 관리',
    desc: 'AI 로그 분석에 사용하는 프롬프트 목록, 설정, 테스트, 적용 결과를 관리하는 영역',
    keywords: [
      '프롬프트',
      'prompt',
      '프롬프트 목록',
      '프롬프트 설정',
      '프롬프트 테스트',
      '설정',
      '수정',
      '역할',
      '규칙',
      '테스트',
      '검증',
      '적용 결과',
    ],
  },
]

const AILOG_EVENT_EXAMPLES: GuidanceExample[] = [
  {
    q: 'AI 로그는 어디서 봐?',
    a: 'AI 로그는 AI 로그 화면의 "AI 로그 목록" 영역에서 직접 확인해 주세요.',
    keywords: ['ai 로그', '로그', '목록', '이벤트'],
  },
  {
    q: 'AI 로그 상세 내용 보고 싶어',
    a: 'AI 로그 상세 내용은 AI 로그 화면의 "AI 로그 목록" 영역에서 직접 확인해 주세요.',
    keywords: ['상세', '상세 내용', '상세정보', '분석 결과', '요약'],
  },
  {
    q: '로그 검색하고 싶어',
    a: 'AI 로그 검색은 AI 로그 화면의 "검색 및 필터" 영역에서 직접 확인해 주세요.',
    keywords: ['검색', '필터', '조회', '찾아'],
  },
  {
    q: '특정 로봇 로그만 보고 싶어',
    a: '특정 로봇의 로그는 AI 로그 화면의 "검색 및 필터" 영역에서 직접 확인해 주세요.',
    keywords: ['특정 로봇', '로봇별', '로봇 로그', '로봇만'],
  },
  {
    q: 'High 로그만 보고 싶어',
    a: 'High 등급 로그는 AI 로그 화면의 "검색 및 필터" 영역에서 직접 확인해 주세요.',
    keywords: ['high', 'critical', 'medium', 'low', '등급', '레벨'],
  },
  {
    q: '이거 어떻게 처리해야 해?',
    a: '처리 방법은 AI 로그 화면의 "추천 Action" 영역에서 직접 확인해 주세요.',
    keywords: ['어떻게 처리', '처리 방법', '조치 방법', '해결 방법', '어떻게 조치'],
  },
  {
    q: '추천 조치가 뭐야?',
    a: '추천 조치는 AI 로그 화면의 "추천 Action" 영역에서 직접 확인해 주세요.',
    keywords: ['추천 조치', '추천 action', '추천 액션', '액션'],
  },
  {
    q: '자동으로 처리할 수 있어?',
    a: '자동 처리 가능 여부는 AI 로그 화면의 "추천 Action" 영역에서 직접 확인해 주세요.',
    keywords: ['자동 처리', '자동화', '자동으로', '자동 조치'],
  },
]

const AILOG_STATS_EXAMPLES: GuidanceExample[] = [
  {
    q: 'AI 로그 통계 어디서 봐?',
    a: 'AI 로그 통계는 AI 로그 통계 화면의 "통계 현황" 영역에서 직접 확인해 주세요.',
    keywords: ['통계', '요약', '건수', '지표'],
  },
  {
    q: '기간별 추이 보고 싶어',
    a: '기간별 추이는 AI 로그 통계 화면의 "통계 현황" 영역에서 직접 확인해 주세요.',
    keywords: ['기간별', '추이', '그래프', '일별', '주별', '월별'],
  },
  {
    q: '유형별로 얼마나 발생했어?',
    a: '유형별 발생 현황은 AI 로그 통계 화면의 "통계 현황" 영역에서 직접 확인해 주세요.',
    keywords: ['유형별', '유형', '얼마나', '발생'],
  },
  {
    q: '가장 많이 발생한 문제는 뭐야?',
    a: '가장 많이 발생한 문제는 AI 로그 통계 화면의 "통계 현황" 영역에서 직접 확인해 주세요.',
    keywords: ['가장 많이', '많이 발생', 'top', 'top10', '순위'],
  },
]

const AILOG_FUNC_EXAMPLES: GuidanceExample[] = [
  {
    q: '기능별 로그 어디서 봐?',
    a: '기능별 로그는 AI 기능별 로그 화면의 "기능별 분석" 영역에서 직접 확인해 주세요.',
    keywords: ['기능별', '기능', '로그', '모듈'],
  },
  {
    q: '기능별 분석 결과 보고 싶어',
    a: '기능별 분석 결과는 AI 기능별 로그 화면의 "기능별 분석" 영역에서 직접 확인해 주세요.',
    keywords: ['기능별 분석', '분석 결과', '성공', '실패'],
  },
  {
    q: '주행 문제 많이 발생해?',
    a: '주행 관련 문제는 AI 기능별 로그 화면의 "기능별 분석" 영역에서 직접 확인해 주세요.',
    keywords: ['주행', '주행 문제', 'navigation', 'navi'],
  },
  {
    q: 'BSP 문제는 어디서 봐?',
    a: 'BSP 관련 문제는 AI 기능별 로그 화면의 "기능별 분석" 영역에서 직접 확인해 주세요.',
    keywords: ['bsp', '보드', 'board'],
  },
]

const AILOG_ASSIGNEES_EXAMPLES: GuidanceExample[] = [
  {
    q: '담당자별 처리 현황 어디서 봐?',
    a: '담당자별 처리 현황은 AI 로그 담당자 화면의 "담당자 현황" 영역에서 직접 확인해 주세요.',
    keywords: ['담당자별', '담당자', '처리 현황'],
  },
  {
    q: '미처리 로그 있어?',
    a: 'AI 로그 처리 상태는 AI 로그 담당자 화면의 "담당자 현황" 영역에서 직접 확인해 주세요.',
    keywords: ['미처리', '처리중', '완료', '처리 상태'],
  },
  {
    q: '누가 처리해야 해?',
    a: 'AI 로그 담당자는 AI 로그 담당자 화면의 "담당자 현황" 영역에서 직접 확인해 주세요.',
    keywords: ['누가', '담당', '담당자', '처리자', '할당'],
  },
]

const AILOG_REPORT_EXAMPLES: GuidanceExample[] = [
  {
    q: 'AI 로그 리포트 어디서 봐?',
    a: 'AI 로그 리포트는 AI 로그 리포트 화면의 "리포트" 영역에서 직접 확인해 주세요.',
    keywords: ['리포트', '보고서', '목록'],
  },
  {
    q: '리포트 다운로드하고 싶어',
    a: '리포트 다운로드는 AI 로그 리포트 화면의 "리포트" 영역에서 직접 확인해 주세요.',
    keywords: ['다운로드', '생성', '내보내기', '저장'],
  },
]

const AILOG_PROMPT_EXAMPLES: GuidanceExample[] = [
  {
    q: '프롬프트 목록 어디서 봐?',
    a: '프롬프트 목록은 AI 로그 프롬프트 화면의 "프롬프트 관리" 영역에서 직접 확인해 주세요.',
    keywords: ['프롬프트 목록', '프롬프트', 'prompt'],
  },
  {
    q: '프롬프트 설정하고 싶어',
    a: '프롬프트 설정은 AI 로그 프롬프트 화면의 "프롬프트 관리" 영역에서 직접 확인해 주세요.',
    keywords: ['프롬프트 설정', '설정', '수정', '규칙'],
  },
  {
    q: '프롬프트 테스트는 어디서 해?',
    a: '프롬프트 테스트는 AI 로그 프롬프트 화면의 "프롬프트 관리" 영역에서 직접 확인해 주세요.',
    keywords: ['프롬프트 테스트', '테스트', '검증', '결과'],
  },
]

const AILOG_GUIDANCE_BY_ACTION: Record<
  AilogChatAction,
  {
    screenName: string
    sections: GuidanceSection[]
    examples: GuidanceExample[]
    fallbackText: string
  }
> = {
  ailog: {
    screenName: 'AI 로그',
    sections: AILOG_EVENT_SECTIONS,
    examples: AILOG_EVENT_EXAMPLES,
    fallbackText: 'AI 로그 관련 정보는 AI 로그 화면에서 직접 확인해 주세요.',
  },
  'ailog/stats': {
    screenName: 'AI 로그 통계',
    sections: AILOG_STATS_SECTIONS,
    examples: AILOG_STATS_EXAMPLES,
    fallbackText:
      'AI 로그 통계 관련 정보는 AI 로그 통계 화면에서 직접 확인해 주세요.',
  },
  'ailog/func': {
    screenName: 'AI 기능별 로그',
    sections: AILOG_FUNC_SECTIONS,
    examples: AILOG_FUNC_EXAMPLES,
    fallbackText:
      'AI 기능별 로그 관련 정보는 AI 기능별 로그 화면에서 직접 확인해 주세요.',
  },
  'ailog/assignees': {
    screenName: 'AI 로그 담당자',
    sections: AILOG_ASSIGNEES_SECTIONS,
    examples: AILOG_ASSIGNEES_EXAMPLES,
    fallbackText:
      'AI 로그 담당자 관련 정보는 AI 로그 담당자 화면에서 직접 확인해 주세요.',
  },
  'ailog/report': {
    screenName: 'AI 로그 리포트',
    sections: AILOG_REPORT_SECTIONS,
    examples: AILOG_REPORT_EXAMPLES,
    fallbackText:
      'AI 로그 리포트 관련 정보는 AI 로그 리포트 화면에서 직접 확인해 주세요.',
  },
  'ailog/prompt': {
    screenName: 'AI 로그 프롬프트',
    sections: AILOG_PROMPT_SECTIONS,
    examples: AILOG_PROMPT_EXAMPLES,
    fallbackText:
      'AI 로그 프롬프트 관련 정보는 AI 로그 프롬프트 화면에서 직접 확인해 주세요.',
  },
}

export function buildAilogPrompt(
  msg: string,
  chatAction: AilogChatAction = 'ailog'
): string {
  const guidance = AILOG_GUIDANCE_BY_ACTION[chatAction]

  return buildGuidanceAnswer({
    screenName: guidance.screenName,
    sections: guidance.sections,
    examples: guidance.examples,
    msg,
    fallbackText: guidance.fallbackText,
  })
}