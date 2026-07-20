import styled from 'styled-components'

export const StyledRadioCard = styled.label`
  display: flex;
  align-items: flex-start;
  gap: 1.2rem;
  flex: 1;
  padding: 2rem;
  border: 1px solid var(--color-secondary-30);
  border-radius: 1.2rem;
  background: var(--color-neutral-10);
  cursor: pointer;
  transition: all 0.2s ease;
  position: relative;

  &:hover {
    border-color: var(--color-primary-50);
  }

  &.disabled {
    cursor: not-allowed;
    opacity: 0.5;

    &:hover {
      border-color: var(--color-secondary-30);
    }
  }

  input {
    opacity: 0;
    position: absolute;
    pointer-events: none;

    & + .radio-mark {
      flex-shrink: 0;
      margin-top: 0.2rem;
      width: 2rem;
      height: 2rem;
      border-radius: 50%;
      border: 2px solid var(--color-secondary-30);
      background: var(--color-neutral-10);
      transition: all 0.2s ease;
      display: flex;
      align-items: center;
      justify-content: center;
      position: relative;

      &::after {
        content: '';
        width: 1rem;
        height: 1rem;
        border-radius: 50%;
        background: var(--color-primary-70);
        display: none;
      }
    }

    &:checked + .radio-mark {
      border-color: var(--color-primary-70);
      &::after {
        display: block;
      }
    }

    &:focus-visible + .radio-mark {
      outline: 2px solid var(--color-primary-60);
      outline-offset: 2px;
    }
  }

  &:has(input:checked) {
    border-color: var(--color-primary-70);
  }

  .content {
    display: flex;
    flex-direction: column;
    gap: 0.6rem;
  }

  .heading {
    display: flex;
    align-items: baseline;
    gap: 0.8rem;
  }

  .title {
    font-weight: 600;
    color: var(--color-neutral-90);
  }

  .subtitle {
    color: var(--color-neutral-70);
  }

  .description {
    color: var(--color-neutral-60);
    line-height: 1.8rem;
  }
`
