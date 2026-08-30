import styled from 'styled-components'

export const AdminLayout = styled.div`
  display: flex;
  gap: 1.6rem;
  width: 100%;
  min-height: 100%;
  padding: 2.4rem;

  @media (max-width: 900px) {
    flex-direction: column;
  }
`

export const Panel = styled.section`
  display: flex;
  flex-direction: column;
  gap: 1.2rem;
  flex: 1 1 auto;
  min-width: 0; /* 테이블 가로 스크롤이 부모를 밀어내지 않게 */
  padding: 1.6rem;
  border: 1px solid #e6ebf2;
  border-radius: 0.8rem;
  background: #fff;
`

export const PanelHeader = styled.header`
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 1.2rem;
  flex-wrap: wrap;
`

export const PanelTitle = styled.h2`
  display: flex;
  align-items: baseline;
  gap: 0.8rem;
  margin: 0;
  font-size: 1.8rem;
  font-weight: 600;

  small {
    color: #8b95a5;
    font-size: 1.3rem;
    font-weight: 400;
  }
`

export const FilterRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: flex-end;
  gap: 0.8rem;

  > * {
    min-width: 14rem;
  }
`

export const Actions = styled.div`
  display: flex;
  gap: 0.6rem;
`

export const Notice = styled.p`
  margin: 0;
  padding: 0.8rem 1.2rem;
  border-radius: 0.6rem;
  background: #fff8e1;
  color: #8a6100;
  font-size: 1.3rem;
  line-height: 1.5;
`

export const FormGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 1.2rem;
  max-height: 60vh;
  overflow-y: auto;

  /* JSON 편집기는 한 줄을 다 쓴다 */
  > .full {
    grid-column: 1 / -1;
  }

  @media (max-width: 768px) {
    grid-template-columns: 1fr;
  }
`

export const FieldHint = styled.small`
  display: block;
  margin-top: 0.4rem;
  color: #8b95a5;
  font-size: 1.2rem;
`
