import React, { useState, useMemo } from 'react'
import { Table, IconButton, Icon, Modal } from '@repo/ui'
import { useTranslation } from 'react-i18next'
import { convertDateToString } from '@repo/utils'
import ExpandOfDevice from './ExpandOfDevice'
import { useOrganizationStore } from '@repo/stores'

const DeviceTable = ({ data, ...rest }) => {
  const { t } = useTranslation('device')
  const [selectedRowId, setSelectedRowId] = useState(null)
  const { actualOrgs } = useOrganizationStore()

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
            <IconButton
              size="sm"
              onClick={(e) => {
                e.stopPropagation()
                openModal(id)
              }}
            >
              <Icon name="device" color="var(--color-neutral-80)" size={18} />
            </IconButton>
          </div>
        )
      }
    })
  }, [data])

  const selectedRow = useMemo(
    () => processedData.find((item) => item.id === selectedRowId) || null,
    [processedData, selectedRowId]
  )

  const columns = [
    {
      name: t('deviceName'),
      selector: (row) => row.displayName || '-',
      sortable: 'true'
    },
    {
      name: t('organizationName'),
      selector: (row) => actualOrgs.find((org) => org.id === row.Organization.id)?.displayName,
      // selector: (row) => row.Organization.displayName,
      sortable: 'true'
    },
    {
      name: t('deviceType'),
      selector: (row) => row.DeviceType?.displayName || '-',
      sortable: 'true'
    },
    {
      name: t('module'),
      selector: (row) => row.manage
    },
    {
      name: t('updatedAt'),
      selector: (row) => (row.updatedAt ? convertDateToString(row.updatedAt) : '-'),
      sortable: 'true'
    }
  ]

  return (
    <>
      <Table columns={columns} data={processedData} {...rest} />
      <Modal
        isOpen={!!selectedRow}
        title={`${t('module')} [${t('deviceName')} : ${selectedRow?.displayName}]`}
        closeButton
        size="xl"
        onClose={closeModal}
      >
        {selectedRow && (
          <ExpandOfDevice
            data={selectedRow}
            isClosing={false}
            inModal
            allModules={rest.allModules}
            noData={t('noData')}
          />
        )}
      </Modal>
    </>
  )
}

export default DeviceTable
