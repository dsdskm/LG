import { Table } from '@repo/ui'

const LabelTable = ({ columns, data, isLoading, noData, onRowClick }) => {
  return (
    <Table
      columns={columns}
      data={data}
      loading={isLoading}
      noData={noData}
      onRowClick={onRowClick}
      pagination
      paginationRowsPerPageOptions={[10, 30, 50, 100]}
    />
  )
}

export default LabelTable
