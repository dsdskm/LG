import styled, { css } from 'styled-components'
import { NavLink } from 'react-router-dom'

const gnbButtonStyles = css`
  display: flex;
  align-items: center;
  gap: 0.6rem;
  width: 100%;
  padding: 1.4rem;
  // border-radius: var(--radius-lg);
  color: var(--color-neutral-70);

  &:hover {
    background: var(--color-secondary-20);
  }

  &:active {
    background: var(--color-secondary-30);
  }

  &.active {
    font-weight: 700;
    letter-spacing: -0.05em;
    background: var(--color-neutral-10);
    color: var(--color-neutral-90);
  }

  @media all and (max-width: 767px) {
    padding: 1rem 1.4rem;

    svg {
      display: none;
    }
  }
`

export const StyledGnbButton = styled.button`
  ${gnbButtonStyles}
  ${({ $compact }) =>
    $compact === 'true' &&
    `
  `}
`

export const StyledGnbLink = styled(NavLink)`
  ${gnbButtonStyles}
  ${({ $compact, $depth }) =>
    $compact === 'true' &&
    ($depth === 0
      ? `
      `
      : `
        color: var(--color-neutral-10);
        border-radius: var(--radius-xs);
        padding: 1.2rem 0.8rem;
        font-size: var(--font-size-body-6);
        line-height: var(--line-height-body-6);
        
        &:hover {
          color: var(--color-neutral-70);
        }
      
        &:active {
          color: var(--color-neutral-70);
        }
      
        &.active {
          color: var(--color-neutral-70);
        }
    `)}
`

export const StyledGnbExternalLink = styled.a`
  ${gnbButtonStyles}
  text-decoration: none;
  ${({ $compact, $depth }) =>
    $compact === 'true' &&
    ($depth === 0
      ? `
      `
      : `
        color: var(--color-neutral-10);
        border-radius: var(--radius-xs);
        padding: 1.2rem 0.8rem;
        font-size: var(--font-size-body-6);
        line-height: var(--line-height-body-6);
        
        &:hover {
          color: var(--color-neutral-70);
        }
      
        &:active {
          color: var(--color-neutral-70);
        }
      
        &.active {
          color: var(--color-neutral-70);
        }
    `)}
`
