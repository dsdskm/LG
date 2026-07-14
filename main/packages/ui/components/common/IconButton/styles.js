import styled, { css } from 'styled-components'
import { buttonStyle } from '@repo/ui/styles'
import { Link } from 'react-router-dom'

const IconButtonStyles = css`
  ${buttonStyle};

  & > .label {
    display: none;
  }

  ${({ $size, $shape }) => {
    switch ($size) {
      case 'lg':
        return `
          padding: 0.7rem;
          border-radius: ${$shape === 'round' ? '50%' : 'var(--radius-md)'};
        `
      case 'sm':
        return `
          border-radius: ${$shape === 'round' ? '50%' : 'var(--radius-xs)'};
          padding: 0.4rem;
        `
      case 'xs':
        return `
          border-radius: ${$shape === 'round' ? '50%' : 'var(--radius-xs)'};
          padding: 0.3rem;
        `
      case 'md':
      default:
        return `
          padding: 0.5rem;
          border-radius: ${$shape === 'round' ? '50%' : 'var(--radius-sm)'};
        `
    }
  }}

  ${({ $theme }) => {
    switch ($theme) {
      case 'filled':
        return `
          background: var(--color-neutral-10);
          border: 1px solid transparent;
          color: var(--color-neutral-80);
          
          &:hover {
            background: var(--color-secondary-20);
          }
          
          &:active {
            background: var(--color-secondary-30);
          }
        `
      case 'icon-only':
        return `
          border: 1px solid transparent;
          color: var(--color-neutral-80);
          
          &:hover {
            background: var(--color-secondary-20);
          }
          
          &:active {
            background: var(--color-secondary-30);
          }
        `
      case 'dark':
        return `
          background: var(--alpha-black-30);
          border: 1px solid transparent;
          color: var(--color-neutral-10);
          
          &:hover {
            background: var(--alpha-black-45);
          }
          
          &:active {
            background: var(--alpha-black-55);
          }
        `
      case 'outlined':
      default:
        return `
          background: var(--color-neutral-10);
          border: 1px solid var(--color-secondary-20);
          color: var(--color-neutral-80);
          
          &:hover {
            background: var(--color-secondary-20);
            border: 1px solid var(--color-secondary-20);
          }
          
          &:active {
            background: var(--color-secondary-30);
            border: 1px solid var(--color-secondary-40);
          }
        `
    }
  }}
`

export const StyledIconButton = styled.button`
  ${IconButtonStyles};
`

export const StyledIconLink = styled(Link)`
  ${IconButtonStyles};
`
