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
    min-height: 4rem;
  }

  .rdt_TableCol {
    padding: 0.8rem 1.2rem;
    font-size: var(--font-size-heading-7);
    line-height: var(--line-height-heading-7);
    font-weight: 700;

    &:not(:last-of-type) {
      border-right: 1px solid var(--alpha-table-border);
    }
  }

  // 정렬 아이콘 SVG는 라이브러리가 svg 태그 자체를 대상으로 폭/높이를 강제하는데,
  // 텍스트는 폰트 메트릭상 줄 중앙보다 살짝 아래로 그려져 두 요소가 align-items: center 로
  // 감싸져도 미세하게 어긋나 보인다. 아이콘 wrapper만 살짝 내려서 타이틀과 눈높이를 맞춘다.
  .__rdt_custom_sort_icon__ {
    display: inline-flex;
    transform: translateY(1px);
  }

  .rdt_TableRow {
    position: relative;
    min-height: 4.5rem;
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
