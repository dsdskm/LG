import styled from 'styled-components'

export const DropdownContainer = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 2rem;
  margin-bottom: 2rem;

  @media all and (min-width: 1580px) {
    ${({ $disableCenter }) =>
      !$disableCenter &&
      `
        width: 90%;
        margin: 0 auto 2rem auto;
      `}
  }
`
