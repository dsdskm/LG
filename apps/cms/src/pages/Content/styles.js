import styled from 'styled-components'

export const ButtonWrap = styled.div`
  display: flex;
  justify-content: flex-end;
  gap: 8px;
`

export const PageHeadWrap = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 1rem;
  width: 100%;
  margin: 0 auto 2rem auto;

  & > div:first-child {
    font-weight: bold;
  }

  ${ButtonWrap} {
    margin: 0;
  }
  @media all and (min-width: 1580px) {
    width: 90%;
  }
`

export const DropdownContainer = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: flex-end;
  gap: 1rem;
  margin-bottom: 2rem;
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

/* ===== 언어별 업로드 리디자인 ===== */
export const EditorTwoCol = styled.div`
  display: flex;
  gap: 1.6rem;
  align-items: stretch;

  @media all and (max-width: 1024px) {
    flex-direction: column;
  }
`

export const ContentCard = styled.div`
  flex: 1 1 auto;
  min-width: 0;
  border: 1px solid var(--color-secondary-20);
  border-radius: var(--radius-md);
  padding: 1.6rem;
`

export const PreviewCard = styled.div`
  flex: 0 0 28rem;
  border: 1px solid var(--color-secondary-20);
  border-radius: var(--radius-md);
  padding: 1.6rem;
`

export const CardTitle = styled.div`
  font-size: 1.5rem;
  font-weight: 700;
  margin-bottom: 1.2rem;
`

export const FileRow = styled.div`
  display: flex;
  align-items: flex-start;
  gap: 1rem;
  padding: 1rem;
  border: 1px solid ${(props) => (props.$selected ? 'var(--color-primary-70)' : 'var(--color-secondary-20)')};
  border-radius: var(--radius-md);
  margin-bottom: 1rem;
  cursor: pointer;
  background: ${(props) => (props.$selected ? 'var(--color-primary-10)' : 'var(--color-neutral-10)')};

  & .attach-col {
    flex: 0 0 auto;
    display: flex;
    flex-direction: column;
    gap: 0.6rem;
  }
  & .resolution-hint {
    font-size: 1.2rem;
    color: var(--color-neutral-60);
  }
  & .name-col {
    flex: 1 1 auto;
    display: flex;
    align-items: center;
    justify-content: flex-end;
    min-width: 0;
  }
`

export const FileNameChip = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 0.6rem;
  font-size: var(--font-size-body-5);
  line-height: var(--line-height-body-5);
  color: var(--color-neutral-80);
  max-width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;

  & .remove {
    display: inline-flex;
    align-items: center;
    cursor: pointer;
    color: var(--color-neutral-60);
    &:hover {
      color: var(--color-error-60);
    }
  }
`

export const MoveBtnGroup = styled.div`
  flex: 0 0 auto;
  display: flex;
  flex-direction: column;
  gap: 0.3rem;
`

export const PreviewBox = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 20rem;
  background: var(--color-neutral-15);
  border-radius: var(--radius-sm);
  overflow: hidden;

  img,
  video {
    max-width: 100%;
    max-height: 26rem;
    object-fit: contain;
  }
  audio {
    width: 100%;
  }
  & .placeholder {
    color: var(--color-neutral-40);
    font-size: 1.3rem;
  }
`

export const ContentTypeBadge = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 0.6rem;
  padding: 0.4rem 1.2rem;
  border-radius: 2rem;
  font-size: var(--font-size-body-5);
  font-weight: 600;
  line-height: 1;
  border: 1px solid ${({ $border }) => $border || 'var(--color-secondary-20)'};
  background: ${({ $bg }) => $bg || 'var(--color-secondary-10)'};
  color: ${({ $color }) => $color || 'var(--color-neutral-80)'};
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);

  svg {
    display: inline-block;
    vertical-align: middle;
  }
`
