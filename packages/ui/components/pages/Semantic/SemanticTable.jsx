import { useState, useEffect, useCallback, useMemo, Suspense } from 'react'
import { Button, Modal } from '@repo/ui'
import { ButtonWrapper, RowCommands } from './styles'

import { TableCard, Icon } from '@repo/ui'
import { useTranslation } from 'react-i18next'

const SemanticTable = ({
  poiVersion,
  data,
  workingData,
  operationMode,
  isLoading,
  noData,
  // 상세/생성 폼이 열려 있는 동안 목록의 명령 버튼을 잠근다 — 편집 중에 삭제 모드로 들어가거나
  // 새 POI 생성을 겹쳐 시작하면 어느 POI 를 고치는 중인지 알 수 없게 된다.
  actionsDisabled = false,
  onCreate,
  onNameClick,
  onPoiDeleted,
  onPoiRestore,
  // 이동 명령은 앱이 갖고 있으므로 주입받는다 — 없으면 이동 버튼을 노출하지 않는다.
  onPoiGoto = null,
  gotoDisabled = false,
  // 문구는 앱이 자기 i18n 으로 넘길 수 있게 열어 두고, 없으면 이 컴포넌트의 번역을 쓴다.
  gotoLabel = ''
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
      name: t('columns.inUse'),
      cell: (row) => {
        if (row?.editStatus?.inUsed) {
          return (
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: '3.2rem',
                height: '3.2rem',
                borderRadius: '50%',
                background: '#f0f9ff',
                border: `1px solid #e0f2fe`
              }}
            >
              <Icon name={'check'} size={18} color={'#0284c7'} />
            </span>
          )
        } else {
          return null
        }
      },
      grow: 0.2
    },
    {
      name: t('columns.id'),
      cell: (row) => (row.poiId ? String(row.poiId).slice(0, 5) + '***' : ''),
      sortable: 'true',
      grow: 0.2
    },
    {
      name: t('columns.name'),
      cell: (row) => (
        <Button theme="link" onClick={() => onNameClick(row)}>
          {row.name.default}
        </Button>
      ),
      sortable: 'true',
      grow: 1.5
    },
    {
      name: t('columns.type'),
      selector: (row) => row.type,
      cell: (row) => row.type,
      sortable: 'true',
      grow: 0.2
    },
    {
      name: t('columns.position'),
      cell: (row) =>
        `[ ${row.pose?.position.x.toFixed(2)}, ${row.pose?.position.y.toFixed(2)}, ${row.pose?.position.z.toFixed(2)} ]`
    },

    {
      name: t('columns.command'),
      cell: (row) => (
        <RowCommands>
          {row.editStatus?.softDelete ? (
            <Button size="sm" color="primary" onClick={() => onPoiRestore(row)}>
              {t('restore')}
            </Button>
          ) : (
            // 삭제 예정 POI 는 이동 대상이 아니므로 이동 버튼을 내리고 삭제 취소만 남긴다.
            onPoiGoto && (
              <Button size="sm" disabled={gotoDisabled} onClick={() => onPoiGoto(row)}>
                {gotoLabel || t('goto')}
              </Button>
            )
          )}
        </RowCommands>
      ),
      grow: 0.5
    }
    //  for debug
    // {
    //   name: 'debug',
    //   cell: (row) =>
    //     row.editStatus ? JSON.stringify(Object.keys(row.editStatus).filter((e) => row.editStatus[e])) : null
    // }
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
            <Button theme="delete" disabled={actionsDisabled} onClick={handleDelete}>
              {t('delete')}
            </Button>
          ) : (
            <>
              <Button theme="delete" disabled={actionsDisabled} onClick={() => setIsDeleteModalOpen(true)}>
                {tCommon('removeSelected')}
              </Button>
              <Button theme="tertiary" disabled={actionsDisabled} onClick={handleDeleteCancel}>
                {tCommon('cancel')}
              </Button>
            </>
          )}

          {!isDeleteMode && (
            <Button disabled={actionsDisabled} onClick={onCreate}>
              {t('create')}
            </Button>
          )}
        </ButtonWrapper>
      )}
      <Suspense fallback={<div>{t('loading')}</div>}>
        <div style={{ margin: '16px 0', fontSize: '14px', fontWeight: 'bold' }}>
          {tCommon('count')} : {operationMode === 'IN-USE' ? data.length : workingData.length}
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
        title={t('delete')}
        onClose={() => setIsDeleteModalOpen(false)}
        size="md"
        renderButtonComponent={
          <ButtonWrapper className="alignRight" style={{ marginTop: '2rem' }}>
            <Button theme="delete" onClick={handleConfirmDelete}>
              {tCommon('confirm')}
            </Button>
            <Button theme="tertiary" onClick={() => setIsDeleteModalOpen(false)}>
              {tCommon('cancel')}
            </Button>
          </ButtonWrapper>
        }
      >
        <div style={{ padding: '1rem 0' }}>
          <p>{t('confirmDeleteContents', { count: selectedRows.length })}</p>
        </div>
      </Modal>
    </>
  )
}

export default SemanticTable
