/** [guidance/B] robot 관리(로봇 목록) 화면 안내 프롬프트 빌더. */
import {
  buildGuidanceAnswer,
  type GuidanceExample,
  type GuidanceSection,
} from '../guidance.util'

const MANAGEMENT_SECTIONS: GuidanceSection[] = [
  {
    name: '로봇 목록',
    desc: '등록된 로봇 목록, 이름, 상태, 사이트, 모델 등 기본 정보',
    keywords: ['로봇', '목록', '리스트', '등록', '이름', '모델', '사이트', '기본 정보'],
  },
  {
    name: '로봇 상세 정보',
    desc: '선택한 로봇의 상세 상태, 설정 정보, 운영 정보',
    keywords: ['상세', '상세정보', '상세 정보', '설정', '운영 정보', '선택한 로봇'],
  },
  {
    name: '상태 정보',
    desc: '로봇의 운영/대기/충전/에러 등 현재 상태 정보',
    keywords: ['상태', '운영', '대기', '충전', '에러', '오류', '장애'],
  },
  {
    name: '검색 및 필터',
    desc: '로봇명, 그룹, 사이트, 상태 등을 기준으로 검색/필터링',
    keywords: ['검색', '필터', '찾아', '조회', '그룹', '사이트', '조건'],
  },
]

const MANAGEMENT_EXAMPLES: GuidanceExample[] = [
  {
    q: '로봇 목록 어디서 봐?',
    a: '로봇 목록은 로봇 관리 화면의 "로봇 목록" 영역에서 직접 확인해 주세요.',
    keywords: ['로봇 목록', '목록', '리스트'],
  },
  {
    q: '로봇 상세 정보 보고 싶어',
    a: '로봇 상세 정보는 로봇 관리 화면의 "로봇 상세 정보" 영역에서 직접 확인해 주세요.',
    keywords: ['상세', '상세 정보', '상세정보'],
  },
  {
    q: '에러난 로봇 확인하고 싶어',
    a: '로봇 상태는 로봇 관리 화면의 "상태 정보" 영역에서 직접 확인해 주세요.',
    keywords: ['에러', '오류', '장애', '상태'],
  },
]

export function buildManagementPrompt(msg: string): string {
  return buildGuidanceAnswer({
    screenName: '로봇 관리',
    sections: MANAGEMENT_SECTIONS,
    examples: MANAGEMENT_EXAMPLES,
    msg,
  })
}