import styled from 'styled-components'

export const StyledCheckbox = styled.label`
  display: inline-flex;
  align-items: center;
  gap: 0.8rem;
  color: var(--color-neutral-80);
  cursor: pointer;
  transition: opacity 0.2s ease;

  &:hover .checkbox {
    filter: brightness(0.95);
  }

  &.disabled {
    cursor: not-allowed;
    color: var(--color-neutral-40);

    .checkbox {
      opacity: 0.5;
    }
  }

  input {
    opacity: 0;
    position: absolute;
    pointer-events: none;

    & + .checkbox {
      width: 2rem;
      height: 2rem;
      border-radius: var(--radius-xs);
      transition: all 0.2s ease;
      display: flex;
      align-items: center;
      justify-content: center;

      .checked {
        display: none;
      }

      svg {
        width: 100%;
        height: 100%;
      }
    }

    &:checked + .checkbox {
      .default {
        display: none;
      }
      .checked {
        display: block;
      }
    }

    &:focus-visible + .checkbox {
      outline: 2px solid var(--color-primary-60);
      outline-offset: 2px;
    }
  }
`
