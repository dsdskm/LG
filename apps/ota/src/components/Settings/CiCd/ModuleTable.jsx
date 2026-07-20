import React, { useState, useMemo } from 'react'
import { Table, IconButton, Icon, Button, Checkbox, Modal } from '@repo/ui'
import ExpandOfCiCd from './ExpandOfCiCd'
import { convertDateToString } from '@repo/utils'
import { useTranslation } from 'react-i18next'
import { useOrganizationStore } from '@repo/stores'

const ModuleTable = ({ data, ...rest }) => {
  const [selectedRowId, setSelectedRowId] = useState(null)
  const { t } = useTranslation('settings')
  const { actualOrgs, allOrgs } = useOrganizationStore()

  const findOrgIdByCode = (code) => {
    return allOrgs.find((org) => org.code === code)?.id
  }

  const isActivated = (row) => {
    return row.Cicds?.find((cicd) => cicd.organizationId === findOrgIdByCode(actualOrgs[0]?.code))?.enabled || false
  }

  const AccessCheckbox = ({ row, onChange }) => {
    const isChecked = isActivated(row)

    const handleChange = (e) => {
      onChange(row, e.target.checked)
    }

    return <Checkbox checked={isChecked} onChange={handleChange} disabled={isChecked} />
  }

  const columns = [
    {
      name: t('module'),
      selector: (row) => row?.displayName,
      sortable: 'true'
    },
    {
      name: t('cicdConnection'),
      cell: (row) => <AccessCheckbox row={row} onChange={() => rest.handleToggleChange(row)} />,
      sortable: 'true',
      sortFunction: (rowA, rowB) => {
        const a = rowA.Cicds.length > 0 && rowA.Cicds[0]?.enabled ? 1 : 0
        const b = rowB.Cicds.length > 0 && rowB.Cicds[0]?.enabled ? 1 : 0
        return b - a
      }
    },
    {
      name: t('templateDownload'),
      cell: (row) => (
        <Button size="sm" onClick={() => rest.templateDownload(row)} disabled={!isActivated(row)}>
          {t('download')}
        </Button>
      )
    },
    {
      name: t('cicdAutoDeploy'),
      cell: (row) => row.manage
    },
    {
      name: t('useStartTime'),
      selector: (row) => (row.createdAt ? convertDateToString(row.createdAt) : '-'),
      sortable: 'true'
    }
  ]

  const openModal = (id) => {
    setSelectedRowId(id)
  }

  const closeModal = () => {
    setSelectedRowId(null)
  }

  const processedData = useMemo(() => {
    return data.map((item, index) => {
      const id = item.id || index

      return {
        ...item,
        id,
        manage: (
          <div style={{ display: 'flex', justifyContent: 'center' }}>
            <IconButton size="sm" onClick={() => openModal(id)} disabled={!isActivated(item)}>
              <Icon name="device" color="var(--color-neutral-80)" size={18} />
            </IconButton>
          </div>
        ),
        createdAt: convertDateToString(item.createdAt)
      }
    })
  }, [data])

  const selectedRow = useMemo(
    () => processedData.find((item) => item.id === selectedRowId) || null,
    [processedData, selectedRowId]
  )

  return (
    <>
      <Table columns={columns} data={processedData} {...rest} />
      <Modal
        isOpen={!!selectedRow}
        title={
          selectedRow ? `${t('cicdAutoDeploy')} [${t('moduleName')} : ${selectedRow.displayName}]` : t('cicdAutoDeploy')
        }
        closeButton
        size="xl"
        onClose={closeModal}
      >
        {selectedRow && <ExpandOfCiCd data={selectedRow} isClosing={false} inModal noData={rest.noData} />}
      </Modal>
    </>
  )
}

export default ModuleTable
