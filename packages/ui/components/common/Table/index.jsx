import DataTable from 'react-data-table-component'
import { StyledDataTable } from './styles'
import Pagination from '../../common/Pagination'
import NoData from '../../common/NoData'
import { useMemo } from 'react'
import TableLoading from '../TableLoading'

/**
 * Common Table component based on react-data-table-component
 *
 * @param {Object} props
 * @param {React.ReactNode} [props.noData] - Component or text to show when no data
 * @param {number[]} [props.paginationRowsPerPageOptions] - Rows per page options
 * @param {number} [props.paginationPerPage] - Initial rows per page
 * @param {boolean} [props.isLoading] - Loading state
 * @param {any} rest - Other props passed to DataTable
 */
const Table = ({ noData, paginationRowsPerPageOptions, paginationPerPage, isLoading, ...rest }) => {
  const noDataComponent = useMemo(() => {
    return noData ? <NoData>{noData}</NoData> : null
  }, [noData])

  if (isLoading) {
    return <TableLoading />
  }

  return (
    <StyledDataTable>
      <DataTable
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
