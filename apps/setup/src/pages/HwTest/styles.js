import styled from 'styled-components'

export const StyledPageContent = styled.div`
  display: flex;
  flex-direction: column;
  gap: 2.4rem;
  padding: 2.4rem;
  width: 100%;
  height: 100%;
  overflow: auto;
`

export const ButtonWrap = styled.div`
  display: flex;
  gap: 1rem;
  margin-bottom: 2rem;
  margin-top: 2rem;

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
