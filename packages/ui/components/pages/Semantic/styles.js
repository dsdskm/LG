import styled from 'styled-components'
import { StyledPageContent } from '../../../styles/commonStyle'

// 지도 | 목록/상세 두 열. 공용 StyledPageContent 에는 gap 이 없어 Section 카드가 붙어 보이므로
// 이 화면에서 쓰는 간격만 여기서 준다.
export const SemanticWorkspace = styled(StyledPageContent)`
  gap: 1.6rem;
  min-height: 0;
`

export const ButtonWrapper = styled.div`
  margin-top: 3.2rem;
  display: flex;
  gap: 1.6rem;
  justify-content: flex-end;
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
