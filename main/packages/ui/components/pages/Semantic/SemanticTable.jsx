import { useState, useEffect, useCallback, useMemo, Suspense } from 'react'
import { Button, Modal } from '@repo/ui'
import { ButtonWrapper } from './styles'

import { TableCard } from '@repo/ui'
import { useTranslation } from 'react-i18next'

const SemanticTable = ({
  poiVersion,
  data,
  workingData,
  operationMode,
  isLoading,
  noData,
  onCreate,
  onNameClick,
  onPoiDeleted,
  onPoiRestore
}) => {
  const [isDeleteMode, setIsDeleteMode] = useState(false)
  const [toggleCleared, setToggleCleared] = useState(false)
  const [selectedRows, setSelectedRows] = useState([])
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false)
  const [tableData, setTableData] = useState([])

  const { t } = useTranslation('semantic')
  const { t: tCommon } = useTranslation('common')

  const columns = [
    {
      name: 'ver',
      cell: (row) => poiVersion,
      sortable: 'true'
    },
    {
      name: 'name',
      cell: (row) => (
        <Button theme="link" onClick={() => onNameClick(row)}>
          {row.name.default}
        </Button>
      ),
      sortable: 'true'
    },
    {
      name: 'type',
      selector: (row) => row.type,
      cell: (row) => row.type,
      sortable: 'true'
    },
    {
      name: 'pos',
      cell: (row) => `[ ${row.pose?.position.x}, ${row.pose?.position.y}, ${row.pose?.position.z} ]`
    },
    {
      name: 'state',
      cell: (row) =>
        row.editStatus ? JSON.stringify(Object.keys(row.editStatus).filter((e) => row.editStatus[e])) : null
    },
    {
      name: 'command',
      cell: (row) =>
        row.editStatus?.softDelete && (
          <>
            <Button size="sm" color="primary" onClick={() => onPoiRestore(row)}>
              삭제 취소
            </Button>
          </>
        )
    }
  ]

  const handleDelete = () => {
    setIsDeleteMode(true)
  }

  const handleDeleteCancel = () => {
    setIsDeleteMode(false)
  }

  const handleRowSelected = useCallback(({ selectedRows: rows }) => {
    console.log(rows)
    setSelectedRows(rows)
  }, [])

  const handleConfirmDelete = () => {
    const ids = selectedRows.map((r) => r.id)
    console.log('handleConfirmDelete :', ids)
    if (ids.length === 0) return
    setToggleCleared(true)
    setSelectedRows([])
    setIsDeleteMode(false)
    setIsDeleteModalOpen(false)
    onPoiDeleted(ids)
  }

  useEffect(() => {
    if (operationMode === 'IN-USE') {
      setTableData([...data])
    } else {
      setTableData(workingData)
    }
  }, [operationMode, workingData, data])

  return (
    <>
      {operationMode === 'WORKING' && (
        <ButtonWrapper>
          {!isDeleteMode ? (
            <Button theme="delete" onClick={handleDelete}>
              {t('delete')}
            </Button>
          ) : (
            <>
              <Button theme="delete" onClick={() => setIsDeleteModalOpen(true)}>
                선택 삭제
              </Button>
              <Button onClick={handleDeleteCancel}>취소</Button>
            </>
          )}

          {!isDeleteMode && <Button onClick={onCreate}>생성</Button>}
        </ButtonWrapper>
      )}
      <Suspense fallback={<div>Loading...</div>}>
        <div style={{ margin: '16px 0', fontSize: '14px', fontWeight: 'bold' }}>
          {tCommon('count')} : {data.length}
        </div>

        <TableCard
          columns={columns}
          data={tableData}
          loading={isLoading}
          noData={noData}
          pagination
          paginationRowsPerPageOptions={[10, 30, 50, 100]}
          selectableRows={isDeleteMode}
          selectableRowDisabled={(row) => row.editStatus?.softDelete}
          onSelectedRowsChange={handleRowSelected}
          clearSelectedRows={toggleCleared}
        />
      </Suspense>
      <Modal
        isOpen={isDeleteModalOpen}
        title={t('delete', '삭제')}
        onClose={() => setIsDeleteModalOpen(false)}
        size="md"
        renderButtonComponent={
          <ButtonWrapper className="alignRight" style={{ marginTop: '2rem' }}>
            <Button theme="delete" onClick={handleConfirmDelete}>
              {tCommon('confirm')}
            </Button>
            <Button onClick={() => setIsDeleteModalOpen(false)}>{tCommon('cancel')}</Button>
          </ButtonWrapper>
        }
      >
        <div style={{ padding: '1rem 0' }}>
          <p>
            {t('confirmDeleteContents', {
              count: selectedRows.length,
              defaultValue: '선택한 콘텐츠를 삭제하시겠습니까?'
            })}
          </p>
        </div>
      </Modal>
    </>
  )
}

export default SemanticTable
