import styled from 'styled-components'
import { StyledPageContent } from '../../../styles/commonStyle'

// 지도 | 목록/상세 두 열. 공용 StyledPageContent 에는 gap 이 없어 Section 카드가 붙어 보이므로
// 이 화면에서 쓰는 간격만 여기서 준다.
export const SemanticWorkspace = styled(StyledPageContent)`
  gap: 1.6rem;
  min-height: 0;
`

// POI 상세는 지도/목록 줄 아래에 전체 폭으로 펼친다 — 편집 중에도 목록이 계속 보이도록.
// SemanticDetail 이 자기 Section 을 직접 그리므로 여기서 Section 으로 감싸지 않고(카드 이중),
// 공용 Section 의 flex:1(늘어남)만 내용 높이로 되돌린다.
export const DetailPanel = styled.div`
  & section {
    flex: 0 0 auto;
  }
`

export const ButtonWrapper = styled.div`
  margin-top: 3.2rem;
  display: flex;
  gap: 1.6rem;
  justify-content: flex-end;
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

// 상세 헤더 카드 — 제목과 액션 버튼이 한 줄이고 그 아래 내용이 없으므로 제목의 아래 여백을 지운다.
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
