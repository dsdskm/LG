import styled, { css } from 'styled-components'
import { buttonStyle } from '@repo/ui/styles'

const buttonStyles = css`
  ${buttonStyle};

  font-weight: 500;
  ${({ $size }) => {
    switch ($size) {
      case 'lg':
        return `
            max-width: 28.8rem;
            width: 100%;
            height: 4.8rem;
            line-height: 4.6rem;
            padding: 0 1.6rem;
            border-radius: var(--radius-md);
            font-size: var(--font-size-body-4);
          `
      case 'md':
      default:
        return `
            max-width: 24rem;
            width: 100%;
            height: 3.6rem;
            line-height: 3.4rem;
            padding: 0 1.6rem;
            border-radius: var(--radius-sm);
            font-size: var(--font-size-body-5);
          `
    }
  }};

  ${({ $theme }) => {
    switch ($theme) {
      case 'secondary':
        return `
            background-color: var(--color-secondary-80);
            color: var(--color-neutral-10);
          `
      case 'primary':
        return `
            background-color: var(--t-primary-btn-active-bg);
            color: var(--color-neutral-10);
          `
      case 'tertiary':
      default:
        return `
            background-color: var(--color-neutral-10);
            border: 1px solid var(--color-secondary-20);
            color: var(--color-neutral-80);
          `
    }
  }};
`

export const StyledModalButton = styled.button`
  ${buttonStyles}
`
