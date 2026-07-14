import styled from 'styled-components'

export const TransferListContainer = styled.div`
  display: flex;
  align-items: center;
  gap: 1.6rem;
  width: 100%;
`

export const ListWrapper = styled.div`
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 0.8rem;
`

export const ListBox = styled.div`
  border: 2px solid
    ${(props) =>
      props.disabled
        ? 'var(--color-neutral-30)'
        : props.$highlight
          ? 'var(--color-primary-60)'
          : 'var(--color-secondary-15)'};
  border-radius: 4px;
  height: 400px;
  overflow-y: auto;
  padding: 1.2rem;
  display: flex;
  flex-direction: column;
  gap: 0.8rem;
  background: ${(props) => (props.disabled ? 'var(--color-neutral-10)' : 'white')};
`

export const ListItem = styled.button`
  width: 100%;
  padding: 0.8rem 1.6rem;
  border-radius: 8px;
  border: 2px solid ${(props) => (props.$selected ? 'var(--color-primary-60)' : 'var(--color-secondary-20)')};
  background: ${(props) => (props.$selected ? 'var(--color-primary-10)' : 'white')};
  color: var(--color-neutral-70);
  font-size: 1.4rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  gap: 0.8rem;
  text-align: left;

  &:hover {
    background: var(--color-secondary-20);
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`

export const ArrowContainer = styled.div`
  display: flex;
  flex-direction: column;
  gap: 1.2rem;

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

export const ArrowButton = styled.button`
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  border: 1px solid var(--color-neutral-40);
  background: ${(props) => (props.$active ? 'var(--color-primary-70)' : 'var(--color-neutral-30)')};
  color: ${(props) => (props.$active ? 'var(--color-primary-10)' : 'var(--color-neutral-60)')};
  cursor: ${(props) => (props.disabled ? 'not-allowed' : 'pointer')};
  font-size: 1.8rem;
  padding: 0;

  &:disabled {
    opacity: 0.5;
  }
`
