import styled from 'styled-components'

export const StyledDataTable = styled.div`
  --alpha-table-border: var(--t-table-border);
  flex: 1;
  display: flex;
  flex-direction: column;

  & > *:first-of-type {
    flex-grow: 1;

    & > * {
      height: 100%;
    }
  }

  .rdt_Table {
    border-left: 1px solid var(--alpha-table-border);
    border-right: 1px solid var(--alpha-table-border);
  }

  .rdt_TableHeadRow {
    border-top: 1px solid var(--alpha-table-border);
    border-bottom: 2px solid var(--alpha-table-border);
    background: var(--t-table-head-bg);
    color: var(--t-table-head-fg);
  }

  .rdt_TableCol {
    padding: 1.3rem 1.2rem;
    font-size: var(--font-size-heading-7);
    line-height: var(--line-height-heading-7);
    font-weight: 700;

    &:not(:last-of-type) {
      border-right: 1px solid var(--alpha-table-border);
    }
  }

  .rdt_TableRow {
    position: relative;
    min-height: 5.3rem;
    color: var(--color-neutral-80);
    border-bottom: 1px solid var(--alpha-table-border);
  }

  .rdt_TableCell {
    padding: 0.8rem 1.2rem;
    font-size: var(--font-size-body-6);
    line-height: var(--line-height-body-6);

    &:not(:last-of-type) {
      border-right: 1px solid var(--alpha-table-border);
    }

    & > div {
      width: 100%;
    }
  }

  .rdt_ExpanderRow {
    border-bottom: 1px solid var(--alpha-table-border);
  }

  .no-table-head {
    .rdt_TableBody .rdt_TableRow:first-of-type {
      border-top: 1px solid var(--alpha-table-border);
    }
  }

  ${({ $dense }) =>
    $dense &&
    `
    .rdt_TableRow {
      min-height: 3.2rem;
    }

    .rdt_TableCell {
      padding: 0.3rem 1.2rem;
    }
  `}
`
