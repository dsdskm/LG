import styled from 'styled-components'

export const StyledSelectButton = styled.button`
  display: flex;
  justify-content: ${({ $iconPosition }) => ($iconPosition === 'left' ? 'flex-start' : 'space-between')};
  gap: 1rem;
  align-items: center;
  width: 100%;
  padding: 0 1.2rem;
  outline-offset: -2px;
  background: var(--color-neutral-10);
  border: 1px solid var(--color-secondary-20);
  color: #7d776a;
  border-radius: ${({ $size }) => ($size === 'sm' ? 'var(--radius-xs)' : 'var(--radius-sm)')};
  height: ${({ $size }) => `${$size === 'sm' ? 2.8 : 3.6}rem`};
  ${({ $isOpen, $error }) =>
    $isOpen
      ? `outline: 2px solid var(--color-neutral-80);`
      : $error
        ? `border-color: var(--color-error-60) !important;`
        : `outline: 0; 
        &:hover:not(:disabled) {
          text-decoration: underline;
          background: var(--color-secondary-10);
        }
        &:disabled {
          opacity: 0.4;
        }
  `};

  & > p {
    flex: 1;
    min-width: 0;
    text-align: left;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
`

export const StyledDiv = styled.div`
  margin-top: 1rem;
`
