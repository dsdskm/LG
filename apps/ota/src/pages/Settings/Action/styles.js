import styled from 'styled-components'

export const DropdownContainer = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
  width: 25rem;
`

export const VariableHeader = styled.div`
  display: flex;
  gap: 1.2rem;
  align-items: center;
  margin: 0 2.4rem;
  padding-bottom: 0.8rem;
  color: var(--color-neutral-70);

  & > span {
    flex: 1;
    text-align: center;
    &:first-child {
      flex: 0 0 25rem;
    }
  }
`

export const VariableRow = styled.div`
  display: flex;
  gap: 1.2rem;
  align-items: center;
  width: 100%;

  & > div {
    flex: 1;
    &:first-child {
      flex: 0 0 25rem;
    }
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
