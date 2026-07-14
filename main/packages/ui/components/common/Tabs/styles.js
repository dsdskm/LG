import styled from 'styled-components'

export const StyledTabs = styled.div`
  display: flex;
  flex-direction: column;
  width: 100%;
`

export const StyledTabList = styled.div`
  display: flex;
  border-bottom: 1px solid var(--color-neutral-20);
  gap: 2.4rem;
  margin-bottom: 2rem;
`

export const StyledTabItem = styled.button`
  padding: 1rem 0;
  background: none;
  border: none;
  border-bottom: 2px solid ${({ $active }) => ($active ? 'var(--color-primary-70)' : 'transparent')};
  color: ${({ $active }) => ($active ? 'var(--color-neutral-80)' : 'var(--color-neutral-50)')};
  cursor: pointer;
  transition: all 0.2s ease;
  white-space: nowrap;

  &:hover {
    color: var(--color-neutral-80);
  }
`
