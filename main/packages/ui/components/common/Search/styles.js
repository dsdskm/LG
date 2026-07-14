import styled from 'styled-components'
import { inputStyle } from '@repo/ui/styles'
import { rotateAnimation } from '@repo/ui/styles'

export const StyledSearchWrapper = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
  width: ${({ $width }) => $width || '100%'};
  ${({ $minWidth }) => $minWidth && `min-width: ${$minWidth};`}

  .label {
    color: var(--color-neutral-70);
  }
`

export const StyledSearch = styled.div`
  ${inputStyle};
  width: ${({ $width }) => $width || '100%'};
  ${({ $minWidth }) => $minWidth && `min-width: ${$minWidth};`}

  .searchButton {
    display: inline-flex;
    justify-content: center;
    align-items: center;
  }

  .loading {
    display: inline-flex;
    justify-content: center;
    align-items: center;
    color: var(--color-secondary-50);
    animation: ${rotateAnimation} 1s linear infinite;
  }
`
