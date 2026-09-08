import styled from 'styled-components'
import { StyledPageContent } from '../../../styles/commonStyle'

// 지도 | 목록/상세 두 열. 공용 StyledPageContent 에는 gap 이 없어 Section 카드가 붙어 보이므로
// 이 화면에서 쓰는 간격만 여기서 준다.
export const SemanticWorkspace = styled(StyledPageContent)`
  gap: 1.6rem;
  min-height: 0;
`

// POI 상세는 모달로 띄운다 — 지도/목록 아래에 펼치면 폼이 화면 밖으로 밀려 스크롤해야 보였다.
// SemanticDetail 이 자기 Section 을 직접 그리므로 모달 본문 안에서 카드가 이중으로 보인다:
// 가장 바깥 Section 하나만 테두리/여백을 걷어내고(모달이 이미 카드다) 안쪽 Section 들은 그대로 둔다.
// 공용 Section 의 flex:1(늘어남)도 내용 높이로 되돌린다.
export const DetailModalBody = styled.div`
  & section {
    flex: 0 0 auto;
  }

  & > section {
    background: none;
    border: 0;
    box-shadow: none;

    & > .container {
      padding: 0;
    }
  }
`

export const ButtonWrapper = styled.div`
  margin-top: 3.2rem;
  display: flex;
  gap: 1.6rem;
  justify-content: flex-end;
`

/**
 * 가상 장애물 명령 줄 — 왼쪽에 형태/타입 필터, 오른쪽에 추가 버튼.
 *
 * 라벨이 붙은 Dropdown(라벨 줄 + 컨트롤 3.6rem)과 라벨이 없는 Button 을 한 줄에 두면
 * flex 기본값(stretch)으로 버튼이 줄 전체 높이만큼 늘어나 컨트롤과 아래선이 어긋난다.
 * 아래선을 기준으로 맞추고(align-items: flex-end), 직속 버튼 높이를 Dropdown 컨트롤의
 * md 높이(3.6rem)와 같게 고정한다 — 안쪽 select 버튼은 이미 같은 값이라 영향받지 않는다.
 */
export const ObstacleCommandRow = styled.div`
  margin-top: 3.2rem;
  display: flex;
  gap: 1.6rem;
  align-items: flex-end;
  justify-content: space-between;
  flex-wrap: wrap;

  & > button {
    height: 3.6rem;
  }
`

// 꼭지점 좌표 목록 — 목록 칸과 모달이 같이 쓴다(같은 표기/줄바꿈 규칙).
export const ObstaclePointGrid = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 0.2rem 1.2rem;
  padding: 0.4rem 0;
`

// 새 가상 장애물의 타입/이름을 받는 모달 본문 — 입력이 두 개뿐이라 한 열로 세운다.
export const ObstacleFormBody = styled.div`
  display: flex;
  flex-direction: column;
  gap: 1.6rem;

  & > * {
    width: 100%;
  }
`

// 목록 행의 command 칸 버튼들 — ButtonWrapper 와 달리 셀 안이라 위쪽 여백을 두지 않는다.
export const RowCommands = styled.div`
  display: flex;
  gap: 0.8rem;
  align-items: center;
`

export const CommandButtons = styled.div`
  display: flex;
  gap: 1.6rem;
  justify-content: flex-end;
`

export const CommandRow = styled.div`
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 1.6rem;
  flex-wrap: wrap;
`

export const CommandFilters = styled.div`
  display: flex;
  gap: 0.8rem;
  align-items: flex-end;
  flex-wrap: wrap;
`

// 명령바는 버튼 높이에 맞춰야 하므로, 공용 Section 의 flex:1(늘어남)을 이 자리에서만 끈다
// (공용 Section 컴포넌트는 건드리지 않는다).
export const CommandBar = styled.div`
  & > section {
    flex: 0 0 auto;
  }
`

// 상세 폼의 제목 줄 — 바로 아래 내용이 없으므로(액션 버튼은 폼 맨 아래) SectionTitle 의
// 아래 여백을 지운다. 간격은 감싸는 DetailWrapper 의 gap 이 준다.
export const DetailHeader = styled.div`
  & .title {
    margin-bottom: 0;
  }
`

export const DetailWrapper = styled.div`
  display: flex;
  flex-direction: column;
  gap: 1.6rem;
`

export const FieldGrid = styled.div`
  display: grid;
  gap: 1.2rem;
  grid-template-columns: repeat(auto-fit, minmax(14rem, 1fr));
`

export const MetaText = styled.p`
  font-size: 1.2rem;
  color: var(--color-neutral-60);
`

export const PropertyRow = styled.div`
  display: flex;
  align-items: center;
  gap: 0.8rem;

  & > .field {
    flex: 1;
  }
`
