import styled from 'styled-components'
export const DropdownContainer = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
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
  @media all and (min-width: 1580px) {
    width: 80%;
    margin: 0 auto 2rem auto;
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

export const SelectionTypeContainer = styled.div`
  display: flex;
  gap: 2.4rem;
  margin: 2.4rem 1rem 0 1rem;

  label {
    font-size: 1.6rem;
    font-weight: 500;
    line-height: 2.4rem;
    letter-spacing: 0;
    color: #000;
  }

  ${(props) =>
    props.disabled &&
    `
    opacity: 0.5;
    pointer-events: none;
    button {
      cursor: not-allowed;
    }
  `}
`

export const SelectionItemContainer = styled.div`
  display: flex;
  align-items: flex-start;
  gap: 1.6rem;
`
