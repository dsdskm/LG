import styled from 'styled-components'

export const GroupWrapper = styled.div``

export const DropdownContainer = styled.div`
  display: flex;
  gap: 2rem;
  margin-bottom: 2rem;
`

export const SelectionTypeContainer = styled.div`
  display: flex;
  flex-direction: column;
  gap: 1.6rem;
  // margin: 2.4rem 1rem 0 1rem;

  label {
    font-size: 1.6rem;
    font-weight: 500;
    line-height: 2.4rem;
    letter-spacing: 0;
    color: #000;
  }

  .selection-cards {
    display: flex;
    gap: 2rem;
  }

  ${(props) =>
    props.disabled &&
    `
    opacity: 0.5;
    pointer-events: none;
    button {
      cursor: not-allowed;
    }
  `}
`

export const SelectionItemContainer = styled.div`
  display: flex;
  flex-direction: column;
  align-items: stretch;
  gap: 1.6rem;
  padding: 2rem;
  border: 1px solid var(--color-secondary-30);
  border-radius: 1.2rem;
  background: var(--color-neutral-10);
`

export const SelectionRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 2.4rem;
  align-items: stretch;

  ${SelectionItemContainer} {
    flex: 1;
    min-width: 28rem;
  }
`

export const VersionContainer = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-content: flex-start;
  gap: 0.8rem;
  min-height: 3.2rem;
`

export const DeviceToolbar = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1.2rem;

  .toolbar-title {
    font-size: 1.6rem;
    font-weight: 600;
    color: var(--color-neutral-90);
  }

  .toolbar-actions {
    display: flex;
    align-items: center;
    gap: 1.2rem;
  }

  .clear-all {
    background: none;
    border: none;
    padding: 0;
    cursor: pointer;
    font-size: 1.4rem;
    color: var(--color-primary-50);

    &:disabled {
      color: var(--color-neutral-40);
      cursor: not-allowed;
    }
  }
`

export const ModalFilterContainer = styled.div`
  display: flex;
  flex-direction: column;
  gap: 1.6rem;
  min-width: 60rem;
`

export const ModalSelectionBanner = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.6rem;
  padding: 1.2rem 1.6rem;
  border-radius: 0.8rem;
  background: var(--color-neutral-10);
  font-size: 1.4rem;
  color: var(--color-neutral-90);

  strong {
    font-weight: 700;
  }

  .select-all {
    background: none;
    border: none;
    padding: 0;
    cursor: pointer;
    font-size: 1.4rem;
    font-weight: 600;
    color: var(--color-primary-50);
  }
`
