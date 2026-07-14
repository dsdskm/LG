import styled from 'styled-components'

export const StyledDropdown = styled.div`
  position: relative;
  display: inline-flex;
  flex-direction: column;
  gap: 0.4rem;
  z-index: ${({ $isOpen }) => ($isOpen ? 10 : 0)};

  & > * {
    width: ${({ $minWidth }) => $minWidth || '100%'};
  }

  .label {
    color: var(--color-neutral-70);
  }

  .select {
    position: relative;
    color: var(--color-neutral-80);

    & > * {
      background: var(--color-neutral-10);
      border: 1px solid var(--color-secondary-20);
      border-radius: ${({ $size }) => ($size === 'sm' ? 'var(--radius-xs)' : 'var(--radius-sm)')};
    }
  }
`

export const StyledSelectButton = styled.button`
  display: flex;
  justify-content: space-between;
  gap: 1rem;
  align-items: center;
  width: 100%;
  padding: 0 1.2rem;
  outline-offset: -2px;
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

export const StyledOptions = styled.ul`
  position: fixed;
  top: ${({ $top }) => $top}px;
  left: ${({ $left }) => $left}px;
  width: ${({ $width }) => $width}px;
  max-height: 17.8rem;
  overflow: auto;
  z-index: 1000;

  & > .searchItem {
    padding: 0.8rem 1.2rem;
  }

  .useCheckbox {
    display: flex;
    justify-content: space-between;
    align-items: center;
    width: 100%;
    padding: 1.2rem;
    text-align: left;

    &:not(.selected):hover {
      text-decoration: underline;
      background: var(--color-secondary-10);
    }

    &.selected {
      background: var(--color-secondary-15);
      font-weight: 700;

      &:hover {
        background: var(--color-secondary-20);
      }
    }
  }

  .optionsButton {
    display: flex;
    justify-content: space-between;
    align-items: center;
    width: 100%;
    padding: 1.2rem;
    text-align: left;

    &:not(.selected):hover {
      text-decoration: underline;
      background: var(--color-secondary-10);
    }

    &.selected {
      background: var(--color-secondary-15);
      font-weight: 700;

      &:hover {
        background: var(--color-secondary-20);
      }
    }
  }

  .option__nodata {
    padding: 1rem 1.2rem;
    color: var(--color-neutral-60);
    text-align: center;
    background: var(--color-neutral-10);
    border-radius: 0.4rem;

    &:hover {
      background: var(--color-neutral-20);
    }
  }
`
