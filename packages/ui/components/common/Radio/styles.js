import styled from 'styled-components'

export const StyledRadio = styled.label`
  display: inline-flex;
  align-items: center;
  gap: 0.8rem;
  color: var(--color-neutral-80);
  cursor: pointer;
  transition: opacity 0.2s ease;
  position: relative;

  &:hover .radio-mark {
    filter: brightness(0.95);
  }

  &.disabled {
    cursor: not-allowed;
    color: var(--color-neutral-40);

    .radio-mark {
      opacity: 0.5;
    }
  }

  input {
    opacity: 0;
    position: absolute;
    pointer-events: none;

    & + .radio-mark {
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
        background: var(--t-select-accent);
        display: none;
      }
    }

    &:checked + .radio-mark {
      border-color: var(--t-select-accent);
      &::after {
        display: block;
      }
    }

    &:focus-visible + .radio-mark {
      outline: 2px solid var(--t-select-accent);
      outline-offset: 2px;
    }
  }
`
