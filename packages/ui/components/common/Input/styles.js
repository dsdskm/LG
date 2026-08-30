import styled from 'styled-components'
import { inputStyle } from '@repo/ui/styles'

export const StyledInput = styled.div`
  ${inputStyle};

  input[type='file'] {
    width: auto;
    flex: 0 0 auto;
    height: 100%;
    line-height: ${({ $size }) => ($size === 'sm' ? '3.6rem' : '4.8rem')};
    cursor: pointer;
    color: transparent;
    font-size: 0;

    &::-webkit-file-upload-button {
      display: none;
    }

    &::file-selector-button {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      padding: 0 1.2rem;
      height: 2.8rem;
      margin-top: ${({ $size }) => ($size === 'sm' ? '0.4rem' : '1rem')};
      margin-right: 1.2rem;
      border: 1px solid var(--color-secondary-20);
      border-radius: var(--radius-sm);
      background: var(--color-neutral-10);
      color: var(--color-neutral-80);
      font-family: inherit;
      font-size: ${({ $size }) => ($size === 'sm' ? 'var(--font-size-body-5)' : 'var(--font-size-body-4)')};
      cursor: pointer;
      transition: all 0.2s;

      &:hover {
        background: var(--color-secondary-10);
      }
    }
  }

  .file-name {
    flex: 1;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    pointer-events: none;
    color: var(--color-neutral-100);
  }

  .unit {
    color: var(--color-neutral-70);
  }

  .visibleButton {
    display: inline-flex;
    justify-content: center;
    align-items: center;
    color: var(--color-secondary-80);
  }
`
