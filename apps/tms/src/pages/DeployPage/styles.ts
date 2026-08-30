import styled from 'styled-components'
import { SearchContainer } from '@repo/ui'
import { CenteredContent } from '../RobotDetailPage/styles'

// Deploy 콘텐츠 래퍼.
// 좁은 폭(≤767px)에서 Management(SectionRobot)의 좌우 패딩(2.4rem)과 동일한 여백을 주어
// 필터 행(검색/드롭다운)의 가용 폭을 Management와 일치시킨다.
// → 고정 스택이 아니라, 공간 기준 자연 래핑이 Management와 동일한 지점에서 일어난다
//   (공간 충분하면 1줄, 좁으면 2줄).
export const DeployContent = styled(CenteredContent)`
  @media all and (max-width: 767px) {
    padding-left: 2.4rem;
    padding-right: 2.4rem;
  }
`

// 넓은 폭: 검색창 크기만큼만 차지 → 드롭다운이 검색창 바로 오른쪽에 좌측 정렬로 붙는다.
// 좁은 폭(≤767px): 기존처럼 전체 폭을 차지 → Management 래핑 동작 유지.
export const DeploySearchContainer = styled(SearchContainer)`
  width: auto;

  @media all and (max-width: 767px) {
    width: 100%;
  }
`
