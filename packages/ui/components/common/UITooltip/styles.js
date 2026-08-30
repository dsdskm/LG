import styled from 'styled-components'

export const StyledToolTipContainer = styled.div`
  & .tooltip {
    max-width: 43.2rem;
    padding: ${({ $size }) => ($size === 'lg' ? '1.2rem' : $size === 'md' && '1rem 0.6rem')};
    background-color: var(--color-secondary-80);
    white-space: pre-line;
    z-index: 200;

    & .tooltipTitle + .tooltipDesc {
      margin-top: 0.6rem;
    }
  }
`
