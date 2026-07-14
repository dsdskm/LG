import styled from 'styled-components'

export const StyledGuideButton = styled.button`
  display: inline-flex;
  align-items: center;
  min-height: 2.1rem;
  padding: 0.2rem 0.8rem;
  background-color: #a9acb4;
  border-radius: 3rem;
  font-size: var(--font-size-body-6);
  font-weight: 400;
  color: var(--color-neutral-10);

  &:hover {
    background-color: var(--color-neutral-50);
  }

  &:active {
    background-color: var(--color-neutral-70);
  }

  &:disabled {
    background-color: #a9acb4;
    opacity: 0.4;
    pointer-events: none;
  }
`
