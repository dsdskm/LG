import React, { useState, useEffect, useMemo } from 'react'
import { Table, Checkbox, StyledTag } from '@repo/ui'
import { useTranslation } from 'react-i18next'
import { convertDateToString } from '@repo/utils'
import { DEPLOYMENT_STATUS } from '@/constants/campaign'
import { statusToBgColor, statusToColor } from '@/utils/common'

const DEFAULT_PER_PAGE = 5

const DevicesTableInExpand = ({ data: initialData, statusOption, isLoading, onSelectionChange, mode = 'view' }) => {
  const { t } = useTranslation('campaign')
  const [rows, setRows] = useState(initialData)
  const [currentPage, setCurrentPage] = useState(1)
  const [perPage, setPerPage] = useState(DEFAULT_PER_PAGE)

  useEffect(() => {
    setRows(initialData || [])
  }, [initialData])

  useEffect(() => {
    if (statusOption !== DEPLOYMENT_STATUS.QUEUED) {
      setRows((prevRows) => prevRows.map((row) => ({ ...row, checked: false })))
      onSelectionChange?.([])
    }
  }, [statusOption])

  const isDisable = (row) => {
    const availableStatus = statusToCheck()

    if (mode === 'rollback' && rows.filter((r) => r.id === row.id).length > 1) {
      return true
    }
    return !availableStatus.includes(row.jobExecutionStatus)
  }

  const statusToCheck = () => {
    if (mode === 'rollback') {
      return [DEPLOYMENT_STATUS.SUCCEEDED, DEPLOYMENT_STATUS.FAILED]
    }

    return [DEPLOYMENT_STATUS.QUEUED]
  }

  // 전체 선택 대상 = 체크박스가 활성화되고 화면에 노출되는 행
  // - abort 모드: QUEUED 인 update / rollback 디바이스 모두 선택
  // - rollback 모드: 롤백 행은 체크박스를 숨기므로 제외 (isDisable 로직 유지)
  const isSelectable = (row) => {
    if (isDisable(row)) return false
    if (mode === 'rollback' && row.command === 'rollback') return false
    return true
  }

  const handleAllToggle = (checked) => {
    const pageUniqueIds = new Set(currentPageRows.map((row) => row.uniqueId))
    const updatedRows = rows.map((row) =>
      pageUniqueIds.has(row.uniqueId) && isSelectable(row) ? { ...row, checked } : row
    )
    setRows(updatedRows)
    onSelectionChange?.(updatedRows.filter((row) => row.checked))
  }

  const handleRowToggle = (uniqueId, checked) => {
    const updatedRows = rows.map((row) => (row.uniqueId === uniqueId ? { ...row, checked } : row))
    setRows(updatedRows)
    onSelectionChange?.(updatedRows.filter((row) => row.checked))
  }

  // 페이지 이동 / 페이지당 항목 변경 시 전체 선택 상태를 해제
  const clearSelection = () => {
    setRows((prevRows) => prevRows.map((row) => ({ ...row, checked: false })))
    onSelectionChange?.([])
  }

  const handleChangePage = (page) => {
    setCurrentPage(page)
    clearSelection()
  }

  const handleChangeRowsPerPage = (newPerPage, page) => {
    setPerPage(newPerPage)
    setCurrentPage(page)
    clearSelection()
  }

  // Rollback 과 Update 행을 클러스터링
  const groupedRows = useMemo(() => {
    const groups = new Map()
    rows.forEach((row) => {
      if (!groups.has(row.id)) groups.set(row.id, [])
      groups.get(row.id).push(row)
    })

    const ordered = []
    groups.forEach((groupRows) => {
      const sorted = [...groupRows].sort((a, b) => {
        if (a.command !== b.command) return a.command === 'rollback' ? 1 : -1
        return String(a.jobExecutionAt || '').localeCompare(String(b.jobExecutionAt || ''))
      })
      sorted.forEach((row, index) => {
        ordered.push({
          ...row,
          _group: {
            size: sorted.length,
            index,
            isFirst: index === 0,
            isLast: index === sorted.length - 1
          }
        })
      })
    })
    return ordered
  }, [rows])

  // 현재 pagination 페이지에 보이는 행들 (전체 선택 범위 제한에 사용)
  const currentPageRows = useMemo(() => {
    const start = (currentPage - 1) * perPage
    return groupedRows.slice(start, start + perPage)
  }, [groupedRows, currentPage, perPage])

  // 전체 선택(헤더) 체크박스는 현재 페이지의 선택 가능한 행으로만 범위를 제한
  const selectableRowsInPage = currentPageRows.filter(isSelectable)
  const isAllChecked = selectableRowsInPage.length > 0 && selectableRowsInPage.every((row) => row.checked)

  const GROUP_ACCENT = '#0f766e'

  // 묶음(2개 이상)인 디바이스 행에 좌측 accent 라인과 옅은 배경을 적용해 시각적으로 연결
  const conditionalRowStyles = [
    {
      when: (row) => row._group?.size > 1,
      style: {
        borderLeft: `3px solid ${GROUP_ACCENT}`,
        backgroundColor: 'rgba(15, 118, 110, 0.04)'
      }
    },
    {
      when: (row) => row._group?.size > 1 && !row._group.isLast,
      style: {
        borderBottom: '1px dashed rgba(15, 118, 110, 0.25)'
      }
    }
  ]

  const renderDeviceCell = (row) => {
    const group = row._group || { size: 1, isFirst: true }
    const isGrouped = group.size > 1

    if (isGrouped && !group.isFirst) {
      return (
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', paddingLeft: '4px' }}>
          <span style={{ color: GROUP_ACCENT, fontSize: '14px', lineHeight: 1 }}>↳</span>
          <span style={{ color: '#5f6368' }}>{row.displayName}</span>
        </div>
      )
    }

    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
        <span style={{ fontWeight: isGrouped ? 600 : 400 }}>{row.displayName}</span>
        {isGrouped && (
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              minWidth: '18px',
              height: '18px',
              padding: '0 5px',
              borderRadius: '9px',
              backgroundColor: GROUP_ACCENT,
              color: '#fff',
              fontSize: '11px',
              fontWeight: 600
            }}
            title={t('groupedCommandsCount', { count: group.size })}
          >
            {group.size}
          </span>
        )}
      </div>
    )
  }

  const columns = [
    mode !== 'view'
      ? {
          name: (
            <Checkbox
              checked={isAllChecked}
              onChange={(e) => handleAllToggle(e.target.checked)}
              disabled={selectableRowsInPage.length === 0}
            />
          ),
          cell: (row) =>
            (mode === 'rollback' && row.command === 'rollback') || isDisable(row) ? null : (
              <Checkbox checked={!!row.checked} onChange={(e) => handleRowToggle(row.uniqueId, e.target.checked)} />
            ),
          width: '50px'
        }
      : null,
    {
      name: t('device'),
      cell: renderDeviceCell,
      sortable: 'true',
      sortFunction: (a, b) => (a.displayName || '').localeCompare(b.displayName || '')
    },
    {
      name: t('command'),
      selector: (row) => (
        <StyledTag color={statusToColor(row.command)} bgColor={statusToBgColor(row.command)}>
          {row.command}
        </StyledTag>
      ),
      sortable: 'true',
      sortFunction: (a, b) => {
        if (!a.command && !b.command) return 0
        if (!a.command) return -1
        if (!b.command) return 1
        return a.command.localeCompare(b.command)
      },
      grow: 0.5
    },
    {
      name: t('status'),
      cell: (row) => (
        <StyledTag color={statusToColor(row.jobExecutionStatus)} bgColor={statusToBgColor(row.jobExecutionStatus)}>
          {row.jobExecutionStatus}
        </StyledTag>
      ),
      sortable: 'true',
      sortFunction: (a, b) => {
        if (!a.jobExecutionStatus && !b.jobExecutionStatus) return 0
        if (!a.jobExecutionStatus) return -1
        if (!b.jobExecutionStatus) return 1
        return a.jobExecutionStatus.localeCompare(b.jobExecutionStatus)
      },
      grow: 0.5
    },
    {
      name: 'Status Code',
      cell: (row) => row.statusCode || '200',
      sortable: 'true',
      grow: 0.5
    },
    {
      name: t('updatedAt'),
      selector: (row) => (row.jobExecutionAt ? convertDateToString(row.jobExecutionAt) : '-'),
      sortable: 'true',
      grow: 0.5
    }
  ].filter(Boolean)

  return (
    <Table
      data={groupedRows}
      columns={columns}
      conditionalRowStyles={conditionalRowStyles}
      isLoading={isLoading}
      pagination
      paginationPerPage={DEFAULT_PER_PAGE}
      paginationRowsPerPageOptions={[5, 10]}
      onChangePage={handleChangePage}
      onChangeRowsPerPage={handleChangeRowsPerPage}
      keyField="uniqueId"
    />
  )
}

export default DevicesTableInExpand
