import styled from 'styled-components'

export const StyledPagination = styled.div`
  display: flex;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 1.6rem;

  & > .perPageSelect {
    display: inline-flex;
    align-items: center;
    gap: 0.8rem;
  }

  & > .paginationNav {
    margin: 0 auto;
    display: flex;
    justify-content: center;
    align-items: center;
    gap: 1.6rem;

    & > .pageButtons {
      display: flex;
      justify-content: center;
      align-items: center;
      gap: 0.8rem;
    }
  }
`

export const StyledPageButton = styled.button`
  display: inline-flex;
  justify-content: center;
  align-items: center;
  min-width: 2.8rem;
  min-height: 2.8rem;
  padding: 0.2rem 0.35rem;
  margin: 0.2rem;
  border: 1px solid transparent;
  border-radius: var(--radius-xs);
  color: var(--color-neutral-60);
  background: transparent;

  &:hover {
    background: var(--color-secondary-10);
  }

  &:active {
    background: var(--color-secondary-20);
  }

  &.selected {
    color: var(--color-secondary-80);
    background: var(--color-secondary-15);
    font-weight: 700;
  }
`
