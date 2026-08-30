import styled from 'styled-components'

export const StyledTag = styled.div`
  display: inline-flex;
  justify-content: center;
  align-items: center;
  gap: 0.4rem;
  min-height: 2.4rem;
  padding: 0.4rem 1.2rem;
  border-radius: var(--radius-xs);
  font-size: var(--font-size-body-6);
  line-height: 1;
  word-break: keep-all;
  text-align: center;

  ${({ $theme }) => {
    switch ($theme) {
      case 'line':
        return `
          background: var(--color-neutral-10);
          color: var(--color-neutral-80);
          border: 1px solid var(--color-secondary-20);
        `
      case 'tint':
        return `
          background: var(--alpha-tint-20);
          color: var(--color-information-85);
          border: 1px solid transparent;
        `
      case 'error':
        return `
          background: var(--color-error-30);
          color: var(--color-error-70);
          border: 1px solid transparent;
        `
      case 'success':
        return `
          background: var(--color-success-20);
          color: var(--color-success-70);
          border: 1px solid transparent;
        `
      case 'secondary':
        return `
          background: var(--color-secondary-80);
          color: var(--color-neutral-10);
          border: 1px solid transparent;
        `
      case 'light':
      default:
        return `
          background: var(--color-secondary-15);
          color: var(--color-neutral-80);
          border: 1px solid transparent;
        `
    }
  }};
`
