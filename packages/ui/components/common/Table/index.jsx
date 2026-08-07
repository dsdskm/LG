import DataTable from 'react-data-table-component'
import { StyledDataTable } from './styles'
import Pagination from '../../common/Pagination'
import NoData from '../../common/NoData'
import { useMemo } from 'react'
import TableLoading from '../TableLoading'

/**
 * Common Table component based on react-data-table-component
 *
 * 순수 테이블(반응형/카드 없음). 데스크톱/모바일 모두 테이블로 렌더한다.
 * 모바일/태블릿에서 카드 뷰로 전환하고 싶으면 TableCard 를 사용한다.
 *
 * @param {Object} props
 * @param {React.ReactNode} [props.noData] - Component or text to show when no data
 * @param {number[]} [props.paginationRowsPerPageOptions] - Rows per page options
 * @param {number} [props.paginationPerPage] - Initial rows per page
 * @param {boolean} [props.isLoading] - Loading state
 * @param {boolean} [props.dense] - Reduce row height / cell padding for a more compact layout
 * @param {any} rest - Other props passed to DataTable
 */
// 셀/헤더가 말줄임(...)으로 잘렸을 때만 네이티브 title 을 설정 → hover 시 브라우저 버블로 전체 내용 표시

const handleCellMouseOver = (e) => {
  const el = e.target
  if (!el || el.nodeType !== 1) return
  // 실제 말줄임(text-overflow: ellipsis)이 적용된 요소만 대상 — overflow 넘침이어도 스타일이 없으면 제외
  const isEllipsized =
    el.scrollWidth > el.clientWidth && getComputedStyle(el).textOverflow === 'ellipsis'
  if (isEllipsized) {
    const text = (el.textContent || '').trim()
    if (text && el.getAttribute('title') !== text) el.setAttribute('title', text)
  } else if (el.hasAttribute('title')) {
    el.removeAttribute('title')
  }
}

const Table = ({
  noData,
  paginationRowsPerPageOptions,
  paginationPerPage,
  isLoading,
  dense,
  columns,
  ...rest
}) => {
  const noDataComponent = useMemo(() => {
    return noData ? <NoData>{noData}</NoData> : null
  }, [noData])

  if (isLoading) {
    return <TableLoading />
  }

  return (
    <StyledDataTable $dense={dense} onMouseOver={handleCellMouseOver}>
      <DataTable
        columns={columns}
        noDataComponent={noDataComponent}
        persistTableHead
        paginationComponent={Pagination}
        paginationRowsPerPageOptions={paginationRowsPerPageOptions || []}
        paginationPerPage={paginationPerPage || paginationRowsPerPageOptions?.[0]}
        {...rest}
      />
    </StyledDataTable>
  )
}

export default Table
