import React from 'react'
import { Table } from '@repo/ui'

const GroupTable = ({
  data: rows = [],
  noData,
  isLoading,
  pagination,
  paginationRowsPerPageOptions,
  onRowClicked,
  pointerOnHover,
  columns
}) => {
  return (
    <Table
      columns={columns}
      data={rows}
      noData={noData}
      isLoading={isLoading}
      pagination={pagination}
      paginationRowsPerPageOptions={paginationRowsPerPageOptions}
      onRowClicked={onRowClicked}
      pointerOnHover={pointerOnHover}
      highlightOnHover
    />
  )
}

export default GroupTable
