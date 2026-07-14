import styled from 'styled-components'

const TableWrapper = styled.div`
  overflow-x: auto;
  border: 1px solid var(--color-secondary-20, #dadde2);
  border-radius: 8px;
`

const Table = styled.table`
  width: 100%;
  border-collapse: collapse;
  font-size: 13px;
`

const Th = styled.th`
  padding: 12px 16px;
  text-align: left;
  font-weight: 600;
  color: var(--color-secondary-50, #848c9d);
  background: var(--color-neutral-10, #fff);
  border-bottom: 1px solid var(--color-secondary-20, #dadde2);
  white-space: nowrap;
`

const Tr = styled.tr`
  cursor: ${({ $clickable }) => ($clickable ? 'pointer' : 'default')};
  background: ${({ $selected }) => ($selected ? 'rgba(74,144,217,0.1)' : 'transparent')};

  &:hover {
    background: var(--color-bg-hover, var(--color-neutral-30, #f5f5f5));
  }
`

const Td = styled.td`
  padding: 12px 16px;
  color: var(--color-secondary-90, #262f44);
  border-bottom: 1px solid var(--color-secondary-20, #dadde2);
`

const Empty = styled.div`
  padding: 40px;
  text-align: center;
  color: var(--color-secondary-50, #848c9d);
  font-size: 14px;
`

export default function DataTable({ columns, data, onRowClick, selectedId, emptyText = '데이터가 없습니다.' }) {
  if (!data || data.length === 0) {
    return (
      <TableWrapper>
        <Table>
          <thead>
            <tr>
              {columns.map((col) => (
                <Th key={col.key}>{col.label}</Th>
              ))}
            </tr>
          </thead>
        </Table>
        <Empty>{emptyText}</Empty>
      </TableWrapper>
    )
  }

  return (
    <TableWrapper>
      <Table>
        <thead>
          <tr>
            {columns.map((col) => (
              <Th key={col.key}>{col.label}</Th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((row) => (
            <Tr
              key={row.id}
              $clickable={!!onRowClick}
              $selected={selectedId === row.id}
              onClick={() => onRowClick && onRowClick(row)}
            >
              {columns.map((col) => (
                <Td key={col.key}>{col.render ? col.render(row[col.key], row) : row[col.key]}</Td>
              ))}
            </Tr>
          ))}
        </tbody>
      </Table>
    </TableWrapper>
  )
}
