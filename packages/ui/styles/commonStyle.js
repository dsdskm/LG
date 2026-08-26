import styled, { css } from 'styled-components'

export const StyledPageContent = styled.div`
  display: flex;
  flex-grow: 1;

  & > section:nth-of-type(2) {
    min-width: 0;
    flex-basis: 38%;
    flex-grow: 0;
  }

  &.column {
    flex-direction: column;

    & > section:nth-child(2) {
      width: 100%;
      flex-grow: 1;
    }
  }

  @media all and (max-width: 1580px) {
    &:not(.single) {
      flex-direction: column;
    }
    & > section:nth-of-type(2) {
      width: 100%;
    }
  }
`

export const StyledDivider = styled.hr`
  height: 0.1rem;
  border: 0;
  margin: ${({ $gap = 2, $full = false }) => `${$gap}rem ${$full ? '-2.4rem' : 0}`};
  background: var(--alpha-black-10);
`

export const StyledReferenceText = styled.p`
  display: flex;
  justify-content: ${({ $align }) => ($align === 'right' ? 'flex-end' : $align === 'center' ? 'center' : 'flex-start')};
  gap: 0.3rem;
  text-align: left;
  color: var(--color-neutral-80);
  font-size: var(--font-size-body-6);
  line-height: var(--line-height-body-6);

  &::before {
    content: '※';
  }
`

export const StyledTextField = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.4rem;

  .label {
    color: var(--color-neutral-70);
  }
`

export const StyledStrongCount = styled.strong`
  color: var(--color-primary-70);
  font-size: var(--font-size-heading-6);
  line-height: var(--line-height-heading-6);
  font-weight: 700;
`

export const StyledDialogContent = styled.div`
  margin-top: 2.4rem;
  text-align: center;
  color: var(--color-neutral-80);

  .error {
    color: var(--color-error-70);
  }

  .inputWrap {
    margin-top: 2.4rem;
  }

  .textareaWrap {
    margin-top: -2.4rem;
  }

  @media all and (max-width: 640px) {
  }
`

export const StyledDetailFooterButtonGroup = styled.div`
  display: flex;
  gap: 0.8rem;
  margin-top: auto;
  padding-top: 3.2rem;
  justify-content: center;

  & > button {
    width: 100%;
    max-width: 24rem;
  }

  @media all and (max-width: 640px) {
    flex-direction: column;

    & > button {
      flex: 1;
      max-width: none;
    }
  }
`

export const StyledManufacturerWrap = styled.div`
  display: flex;

  & > span {
    white-space: pre-wrap;
  }
`

export const inputStyle = css`
  display: flex;
  align-items: center;
  gap: 0.8rem;
  color: var(--color-secondary-60);

  ${({ $size }) =>
    $size === 'xs'
      ? `
    height: 3.2rem;
    padding: 0 1rem;
    border-radius: var(--radius-xs);
    `
      : $size === 'sm'
        ? `
      height: 3.6rem;
      padding: 0 1.2rem;
      border-radius: var(--radius-sm);
      `
        : `
      height: 4.8rem;
      padding: 0 1.6rem;
      border-radius: var(--radius-md);
      `};

  ${({ $theme, $focused, $disabled, $error }) => {
    switch ($theme) {
      case 'fill':
        return `
          background: var(--color-secondary-10);
          border: 1px solid ${$error ? 'var(--color-error-70)' : 'transparent'};

          ${
            !$error
              ? !$disabled
                ? $focused
                  ? `
                outline: 2px solid var(--color-secondary-80);
                outline-offset: -2px;
                `
                  : `
                &:hover { background: var(--color-secondary-15); }
                `
                : `
              opacity: 0.4;
              `
              : `outline: 0;`
          }
        `
      case 'outline':
      default:
        return `
          background: var(--color-neutral-10);
          border: 1px solid var(--color-${$error ? 'error-70' : 'secondary-20'});
          
          ${
            !$error
              ? !$disabled
                ? $focused
                  ? `
                outline: 2px solid var(--color-secondary-80);
                outline-offset: -2px;
                `
                  : `
                &:hover { background: var(--color-secondary-10); }
                `
                : `
              opacity: 0.4;
              `
              : `outline: 0;`
          }
        `
    }
  }};

  & > input,
  & > textarea {
    width: 100%;
    height: 100%;
    flex-grow: 1;
    border: 0;
    outline: 0;
    padding: 0;
    background: transparent;
    color: var(--color-neutral-80);

    &::placeholder {
      color: var(--color-neutral-60);
    }
  }

  .clearButton {
    display: inline-flex;
    justify-content: center;
    align-items: center;
    color: var(--color-secondary-80);
  }
`

export const buttonStyle = css`
  display: inline-flex;
  justify-content: center;
  align-items: center;
  word-break: keep-all;

  &:disabled {
    pointer-events: none;
    opacity: 0.4;
  }
`

export const mobileHeaderButtonStyle = css`
  position: fixed;
  right: 2.4rem;
  z-index: 100;
`

export const HeaderTitleGroup = styled.div`
  display: flex;
  justify-content: space-between;
  gap: 4px;
  align-items: center;

  @media all and (max-width: 767px) {
    flex-wrap: wrap;
    justify-content: flex-start;
  }
`

export const DivSectionTitleWrap = styled.div`
  display: flex;
  align-items: center;

  @media all and (max-width: 767px) {
    flex-wrap: wrap;
    align-items: flex-start;
    gap: 1rem;
  }
`

export const SearchContainer = styled.div`
  display: flex;
  gap: 12px;
  width: 100%;

  .dropdown {
    width: 250px;
  }

  .search {
    width: 100%;
  }

  input {
    flex: 1;
    padding: 10px 16px 10px 0;
    font-size: 14px;
    transition: border-color 0.15s ease;
    box-sizing: border-box;

    &:focus {
      outline: none;
      border-color: #495057;
    }

    &::placeholder {
      color: #adb5bd;
    }
  }

  @media all and (max-width: 767px) {
    width: auto;
    flex: 1;
    min-width: 200px;
    flex-wrap: wrap;

    .search {
      width: 100%;
      margin-bottom: 0.8rem;
    }

    .dropdown {
      width: calc(50% - 6px);
      min-width: 140px;
    }
  }
`

export const VersionContainer = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.4rem;

  .close-icon {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 1.8rem;
    height: 1.8rem;
    margin-left: 1rem;
    border-radius: 50%;
    font-weight: bold;
    font-size: 1rem;
    color: var(--color-neutral-60);
    transition: all 0.2s;
    cursor: pointer;

    &:hover {
      background-color: var(--color-neutral-30);
      color: var(--color-neutral-90);
    }
  }

  .version-label {
    font-size: var(--font-size-body-6);
    line-height: var(--line-height-body-6);
    color: var(--color-neutral-70);
  }

  .version-input-group {
    display: flex;
    align-items: center;
    flex-wrap: nowrap;
    background: var(--color-neutral-10);
    border: 1px solid var(--color-secondary-20);
    border-radius: var(--radius-md);
    min-height: 4.8rem;
    padding: 0.4rem 1.6rem;
    transition: all 0.2s;
    gap: 0.8rem;

    &:focus-within {
      outline: 2px solid var(--color-secondary-80);
      outline-offset: -2px;
    }

    &:hover:not(:focus-within) {
      background: var(--color-secondary-10);
    }

    &.disabled {
      opacity: 0.4;
      pointer-events: none;
    }

    & > div,
    & > button {
      flex-shrink: 0;
    }

    & > div {
      margin-left: 0 !important;
      display: flex;
      align-items: center;

      /* Neutralize internal Input component styles */
      & > div {
        border: 0 !important;
        outline: 0 !important;
        background: transparent !important;
        padding: 0 !important;
        height: auto !important;
        gap: 0 !important;
      }
    }

    input {
      width: auto !important;
      min-width: 12rem;
      border: 0;
      outline: 0;
      background: transparent;
      text-align: left;
      font-size: var(--font-size-body-4);
      color: var(--color-neutral-80);
      padding: 0;

      &::-webkit-inner-spin-button,
      &::-webkit-outer-spin-button {
        -webkit-appearance: none;
        margin: 0;
      }
      -moz-appearance: textfield;

      &:focus {
        color: var(--color-secondary-90);
        font-weight: 600;
      }
    }
  }

  .version-wrapper {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 1.2rem;

    .version-list {
      display: flex;
      flex-wrap: wrap;
      gap: 0.8rem;
      align-items: center;
    }
  }
`
