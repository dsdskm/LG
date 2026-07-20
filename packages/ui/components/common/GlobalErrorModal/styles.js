import styled from 'styled-components'
export const DropdownContainer = styled.div`
  display: flex;
  gap: 2rem;
  margin-bottom: 2rem;

  @media all and (min-width: 1580px) {
    width: 90%;
    margin: 0 auto 2rem auto;
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

export const PageHeadWrap = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 1rem;
  width: 100%;
  margin: 0 auto 2rem auto;

  & > div:first-child {
    font-weight: bold;
  }

  ${ButtonWrap} {
    margin: 0;
  }
  @media all and (min-width: 1580px) {
    width: 90%;
  }
`
