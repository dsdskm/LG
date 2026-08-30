import { useState, useEffect, useMemo } from 'react'
import styled from 'styled-components'
import Pagination from '../Pagination'
import Checkbox from '../Checkbox'
import NoData from '../NoData'

// 모바일/태블릿용 카드 리스트 — 각 행을 세로 "라벨:값" 카드로 렌더 (좌우 스크롤 제거)
const CardTable = ({
  columns = [],
  data = [],
  noData,
  pagination,
  paginationPerPage,
  paginationRowsPerPageOptions = [],
  onChangeRowsPerPage,
  selectableRows,
  onSelectedRowsChange,
  clearSelectedRows,
  renderCard,
  cardVisibleIds
}) => {
  const [currentPage, setCurrentPage] = useState(1)
  const [rowsPerPage, setRowsPerPage] = useState(paginationPerPage || paginationRowsPerPageOptions[0] || 10)
  const [selectedIds, setSelectedIds] = useState(() => new Set())

  const rowKey = (row, idx) => (row?.id != null ? row.id : idx)

  // 카드에 표시할 컬럼: 라벨 있고, (사용자 설정 cardVisibleIds 우선) 표시 대상인 것. cardOrder(없으면 원래 순서)로 정렬.
  const isCardVisible = (col) => {
    if (col.id && cardVisibleIds) return cardVisibleIds.has(col.id) // 사용자 설정 우선
    return col.card !== false // 기본값(카드 힌트)
  }
  const cardColumns = useMemo(
    () =>
      columns
        .map((col, i) => ({ col, i }))
        .filter(({ col }) => col && !col.omit && (col.cardLabel || col.name) && isCardVisible(col))
        .sort((a, b) => (a.col.cardOrder ?? a.i) - (b.col.cardOrder ?? b.i))
        .map(({ col }) => col),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [columns, cardVisibleIds]
  )
  const titleColumn = cardColumns.find((c) => c.cardTitle)
  const fieldColumns = cardColumns.filter((c) => !c.cardTitle)
  const cellValue = (col, row, idx) =>
    col.cardCell ? col.cardCell(row, idx) : col.cell ? col.cell(row, idx) : col.selector ? col.selector(row, idx) : null

  // clearSelectedRows 토글 변화 시 선택 초기화 (RDT 계약과 동일)
  useEffect(() => {
    setSelectedIds(new Set())
  }, [clearSelectedRows])

  // 선택 변경을 부모에 통지 (RDT onSelectedRowsChange 시그니처와 호환)
  const emitSelection = (nextSet) => {
    if (!onSelectedRowsChange) return
    const selectedRows = data.filter((row, idx) => nextSet.has(rowKey(row, idx)))
    onSelectedRowsChange({ allSelected: selectedRows.length === data.length, selectedCount: selectedRows.length, selectedRows })
  }

  const toggleSelect = (key) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      emitSelection(next)
      return next
    })
  }

  const totalPages = pagination ? Math.max(1, Math.ceil(data.length / rowsPerPage)) : 1
  const pageData = useMemo(() => {
    if (!pagination) return data
    const start = (currentPage - 1) * rowsPerPage
    return data.slice(start, start + rowsPerPage)
  }, [pagination, data, currentPage, rowsPerPage])

  if (!data || data.length === 0) {
    return <NoData>{noData}</NoData>
  }

  const handleChangePage = (page) => setCurrentPage(Math.min(Math.max(1, page), totalPages))
  const handleChangeRowsPerPage = (n) => {
    setRowsPerPage(n)
    setCurrentPage(1)
    onChangeRowsPerPage?.(n)
  }

  return (
    <Wrap>
      <CardList>
        {pageData.map((row, i) => {
          const absoluteIdx = pagination ? (currentPage - 1) * rowsPerPage + i : i
          const key = rowKey(row, absoluteIdx)
          return (
            <Card key={key}>
              {(titleColumn || selectableRows) && (
                <div className="cardHeader">
                  {selectableRows && (
                    <span className="cardSelect">
                      <Checkbox checked={selectedIds.has(key)} onChange={() => toggleSelect(key)} />
                    </span>
                  )}
                  {titleColumn && <div className="cardTitle">{cellValue(titleColumn, row, absoluteIdx)}</div>}
                </div>
              )}
              <div className="cardBody">
                {renderCard
                  ? renderCard(row, absoluteIdx)
                  : fieldColumns.map((col, ci) => {
                      const value = cellValue(col, row, absoluteIdx)
                      const isEmpty = value == null || value === ''
                      return (
                        <div className="cardField" key={ci}>
                          <span className="cardLabel">{col.cardLabel || col.name}</span>
                          <span className="cardValue">{isEmpty ? '-' : value}</span>
                        </div>
                      )
                    })}
              </div>
            </Card>
          )
        })}
      </CardList>

      {pagination && paginationRowsPerPageOptions.length > 0 && (
        <Pagination
          currentPage={currentPage}
          rowCount={data.length}
          onChangePage={handleChangePage}
          rowsPerPage={rowsPerPage}
          onChangeRowsPerPage={handleChangeRowsPerPage}
          paginationRowsPerPageOptions={paginationRowsPerPageOptions}
        />
      )}
    </Wrap>
  )
}

export default CardTable

const Wrap = styled.div`
  width: 100%;
  overflow: hidden;
`

const CardList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 1.2rem;
`

const Card = styled.div`
  width: 100%;
  border: 1px solid var(--t-table-border, var(--color-neutral-20, #e5e8eb));
  border-radius: 0.8rem;
  overflow: hidden;
  background: #fff;

  /* 헤더 밴드: 제목/선택 — 옅은 배경 + 하단 구분선으로 본문과 시각적 분리 */
  .cardHeader {
    display: flex;
    align-items: center;
    gap: 0.8rem;
    padding: 1rem 1.4rem;
    background: var(--color-neutral-05, #f6f7f9);
    border-bottom: 1px solid var(--color-neutral-20, #e5e8eb);
  }

  .cardSelect {
    display: inline-flex;
    align-items: center;
    flex: 0 0 auto;
  }

  .cardTitle {
    flex: 1 1 auto;
    min-width: 0;
    font-size: var(--font-size-body-4, 1.6rem);
    font-weight: 700;
    color: var(--color-neutral-90, #191f28);
    word-break: break-word;
  }

  .cardBody {
    display: flex;
    flex-direction: column;
    padding: 0.6rem 1.4rem;
  }

  .cardField {
    display: flex;
    gap: 1rem;
    align-items: flex-start;
    justify-content: space-between;
    padding: 0.7rem 0;
    border-bottom: 1px solid var(--color-neutral-05, #f6f7f9);

    &:last-child {
      border-bottom: 0;
    }
  }

  .cardLabel {
    flex: 0 0 auto;
    min-width: 8rem;
    font-size: var(--font-size-body-6);
    font-weight: 600;
    color: var(--color-neutral-50);
  }

  .cardValue {
    flex: 1 1 auto;
    min-width: 0;
    text-align: right;
    font-size: var(--font-size-body-6);
    color: var(--color-neutral-90, #191f28);
    word-break: break-word;
  }
`
