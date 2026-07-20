import styled from 'styled-components'

export const StyledScrollArea = styled.div`
  overflow: hidden auto;
  display: grid;
  grid-template-rows: 1fr 6rem;
  grid-auto-columns: minmax(100%, 1fr);

  @media all and (max-width: 767px) {
    grid-template-rows: 1fr 12.9rem;
  }
`
