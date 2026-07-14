import React from 'react'
import { Table } from '@repo/ui'

const ArtifactTable = ({
  data: rows = [],
  noData,
  isLoading,
  pagination,
  paginationRowsPerPageOptions,
  onRowClicked,
  columns,
  ...rest
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
      highlightOnHover
      {...rest}
    />
  )
}

export default ArtifactTable
