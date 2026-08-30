import { useMemo, useState } from 'react'
import { useResponsiveStore } from '@repo/stores/useResponsiveStore'
import Table from '../Table'
import CardTable from './CardTable'
import TableLoading from '../TableLoading'
import IconButton from '../IconButton'
import ColumnSettingsModal from './ColumnSettingsModal'
import { loadColumnSettings, saveColumnSettings, getConfigurableColumns } from './columnSettings'

/**
 * 반응형 Table + Card 공용 컴포넌트.
 * 데스크톱(PC)에서는 Table, 태블릿/모바일(≤1200)에서는 CardTable 로 자동 전환한다.
 * tableId 지정 시 컬럼 표시 설정(톱니 + 모달, 테이블/카드 각각)을 제공한다.
 *
 * @param {Object} props
 * @param {React.ReactNode} [props.noData] - Component or text to show when no data
 * @param {number[]} [props.paginationRowsPerPageOptions] - Rows per page options
 * @param {number} [props.paginationPerPage] - Initial rows per page
 * @param {boolean} [props.isLoading] - Loading state
 * @param {boolean} [props.dense] - Reduce row height / cell padding for a more compact layout
 * @param {Function} [props.renderCard] - 카드 본문 커스텀 렌더 (row, idx) => node
 * @param {string} [props.tableId] - 지정 시 컬럼 표시 설정(톱니) 활성 + localStorage 저장
 * @param {any} rest - Other props passed to Table/CardTable
 */
const TableCard = ({
  noData,
  paginationRowsPerPageOptions,
  paginationPerPage,
  isLoading,
  dense,
  renderCard,
  tableId,
  columns,
  ...rest
}) => {
  const { responsiveMode } = useResponsiveStore()
  // 태블릿/모바일(≤1200)일 때만 카드. responsiveMode 는 useWindowDimensions 가 채운다.
  const isCard = !!responsiveMode && responsiveMode !== 'PC'

  // 컬럼 표시 설정(tableId 지정 시): { table:Set, card:Set }
  const [settings, setSettings] = useState(() => (tableId ? loadColumnSettings(tableId, columns) : null))
  const [settingsOpen, setSettingsOpen] = useState(false)

  // 테이블(데스크톱) 표시 컬럼: 설정 있으면 필터, 없으면 전체. id 없는 컬럼은 항상 표시.
  const visibleColumns = useMemo(() => {
    if (!settings) return columns
    return (columns || []).filter((c) => !c?.id || settings.table.has(c.id))
  }, [columns, settings])

  const hasConfigurable = !!tableId && getConfigurableColumns(columns).length > 0

  const handleSaveSettings = (next) => {
    setSettings(next)
    if (tableId) saveColumnSettings(tableId, next)
  }

  if (isLoading) return <TableLoading />

  const body = isCard ? (
    <CardTable
      columns={columns}
      cardVisibleIds={settings?.card ?? null}
      data={rest.data}
      noData={noData}
      pagination={rest.pagination}
      paginationPerPage={paginationPerPage}
      paginationRowsPerPageOptions={paginationRowsPerPageOptions || []}
      onChangeRowsPerPage={rest.onChangeRowsPerPage}
      selectableRows={rest.selectableRows}
      onSelectedRowsChange={rest.onSelectedRowsChange}
      clearSelectedRows={rest.clearSelectedRows}
      renderCard={renderCard}
    />
  ) : (
    <Table
      columns={visibleColumns}
      noData={noData}
      paginationRowsPerPageOptions={paginationRowsPerPageOptions}
      paginationPerPage={paginationPerPage}
      dense={dense}
      {...rest}
    />
  )

  if (!hasConfigurable) return body

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '0.4rem' }}>
        <IconButton size="sm" shape="square" name="settings" onClick={() => setSettingsOpen(true)} />
      </div>
      {body}
      <ColumnSettingsModal
        isOpen={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        columns={columns}
        value={settings}
        onSave={handleSaveSettings}
      />
    </div>
  )
}

export default TableCard
