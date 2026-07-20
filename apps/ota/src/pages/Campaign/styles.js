import styled from 'styled-components'

export const DropdownContainer = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 2rem;
  margin-bottom: 2rem;
`

export const StateStatusList = styled.div`
  display: flex;
  gap: 0.8rem;
  flex-wrap: wrap;
  width: 100%;
  margin: 0 0 2.4rem;

  /* 아래 Section과 좌우 범위 정렬 */
  @media all and (min-width: 1580px) {
    width: 90%;
    margin: 0 auto 2.4rem;
  }
`
