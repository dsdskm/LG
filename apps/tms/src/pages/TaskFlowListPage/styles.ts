import styled from 'styled-components'

export const Card = styled.section`
  display: block;
`

export const ListControls = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;

  @media all and (max-width: 767px) {
    width: 100%;
    flex-wrap: wrap;
  }
`

export const ButtonWrap = styled.div`
  display: flex;
  gap: 1rem;
  margin-bottom: 2rem;

  &.alignLeft {
    justify-content: flex-start;
  }

  &.alignRight {
    justify-content: flex-end;
  }

  &.alignCenter {
    justify-content: center;
  }
`