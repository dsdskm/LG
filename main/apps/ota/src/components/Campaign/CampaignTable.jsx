import React, { useState, useMemo } from 'react'
import { Table, IconButton, Icon, Loading, Modal } from '@repo/ui'
import { useTranslation } from 'react-i18next'
import ExpandOfCampaign from './ExpandOfCampaign'
import { convertDateToString } from '@repo/utils'

const CampaignTable = ({ data, ...rest }) => {
  const { t } = useTranslation('campaign')
  const [selectedRowId, setSelectedRowId] = useState(null)
  const [loadingRowId, setLoadingRowId] = useState(null)
  const [isLoading, setIsLoading] = useState(false)

  const openModal = async (id) => {
    setSelectedRowId(id)
  }

  const closeModal = () => {
    setSelectedRowId(null)
  }

  const processedData = useMemo(() => {
    return data.map((item, index) => {
      const id = item.id || item.Artifact?.id || index

      return {
        ...item,
        id,
        devices: (item.TargetGroup?.Devices || []).map((device) => ({
          ...device,
          checked: false,
          jobExecutionStatus: device.jobExecutionStatus,
          updatedAt: convertDateToString(device.updatedAt),
          campaignId: id
        })),
        artifactName: item.Artifact?.displayName,
        targetGroupName: item.TargetGroup?.displayName,
        manage: (
          <div style={{ display: 'flex', justifyContent: 'center' }}>
            {isLoading && id === loadingRowId ? (
              <Loading />
            ) : (
              <IconButton
                size="sm"
                onClick={(e) => {
                  e.stopPropagation()
                  openModal(id)
                }}
                disabled={!item.manage && !item.jobStatus}
              >
                <Icon name="device" color="var(--color-neutral-80)" size={18} />
              </IconButton>
            )}
          </div>
        ),
        createdAt: convertDateToString(item.createdAt)
      }
    })
  }, [data, isLoading, loadingRowId])

  const selectedRow = useMemo(
    () => processedData.find((item) => item.id === selectedRowId) || null,
    [processedData, selectedRowId]
  )

  return (
    <>
      <Table data={processedData} highlightOnHover {...rest} />
      <Modal
        isOpen={!!selectedRow}
        title={selectedRow ? `${t('device')} [${t('campaignName')} : ${selectedRow?.displayName}]` : t('device')}
        closeButton
        size="xl"
        onClose={closeModal}
      >
        {selectedRow && (
          <ExpandOfCampaign
            command={selectedRow.command}
            jobStatus={selectedRow.jobStatus}
            campaignRollbacks={selectedRow.CampaignRollbacks}
            data={selectedRow}
            isClosing={false}
            inModal
            handleAbort={(devices) => [closeModal(), rest.handleAbort(devices)]}
            handleRollback={(devices) => [closeModal(), rest.handleRollback(devices)]}
            onUpdateCampaign={rest.onUpdateCampaign}
          />
        )}
      </Modal>
    </>
  )
}

export default CampaignTable
