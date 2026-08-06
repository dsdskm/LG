import { useState, useEffect, useCallback, useMemo } from 'react'
import { StyledPageContent, Section, Title, Button, Modal } from '@repo/ui'
import { ButtonWrapper } from './styles'

import { TableCard } from '@repo/ui'
import { useTranslation } from 'react-i18next'

const SemanticTable = ({ data, isLoading, noData, onCreate, onNameClick, onPoiDeleted, onPoiRestore }) => {
  const [isDeleteMode, setIsDeleteMode] = useState(false)
  const [toggleCleared, setToggleCleared] = useState(false)
  const [selectedRows, setSelectedRows] = useState([])
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false)

  const { t } = useTranslation('semantic')
  const { t: tCommon } = useTranslation('common')

  const columns = [
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
        row._work?.state === 'DELETED' ? (
          <Button size="sm" color="primary" onClick={() => onPoiRestore(row)}>
            원복
          </Button>
        ) : (
          row._work?.state
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

  return (
    <>
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

      <TableCard
        columns={columns}
        data={data}
        loading={isLoading}
        noData={noData}
        pagination
        paginationRowsPerPageOptions={[10, 30, 50, 100]}
        selectableRows={isDeleteMode}
        selectableRowDisabled={(row) => row._work?.state === 'DELETED'}
        onSelectedRowsChange={handleRowSelected}
        clearSelectedRows={toggleCleared}
      />

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
