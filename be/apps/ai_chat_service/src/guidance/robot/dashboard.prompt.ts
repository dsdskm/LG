/** [guidance/B] robot 대시보드 화면 안내 프롬프트 빌더. */
import { buildGuidanceAnswer, GuidanceExample, GuidanceSection } from "../guidance.util"

const DASHBOARD_SECTIONS: GuidanceSection[] = [
  {
    name: '대시보드',
    desc: '대시보드',
    keywords: ['현황', '상황', '브리핑', '요약'],
  },
]

const DASHBOARD_EXAMPLES: GuidanceExample[] = [
  {
    q: '브리핑해줘',
    a: '전체 그룹의 학습 목표 달성율, 평균 학습 성공률, 누적 학습자산, 오늘 생성된 학습데이터, 학습중인 로봇의 수는 어제 대비 상승하였습니다. AI 분석 이슈 2건이 있습니다. 9대의 로봇이 대기중, 2대의 로봇이 충전중, 4대의 로봇이 네트워크 끊김 상태입니다.',
    keywords: ['현황', '상황', '브리핑', '요약'],
  },
]

export function buildDashboardPrompt(msg: string): string {
  return buildGuidanceAnswer({
    screenName: '로봇 대시보드',
    sections: DASHBOARD_SECTIONS,
    examples: DASHBOARD_EXAMPLES,
    msg,
  })
}