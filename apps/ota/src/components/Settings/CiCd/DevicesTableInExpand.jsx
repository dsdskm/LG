import React, { useState, useEffect } from 'react'
import { Table, ToggleSwitch, Loading } from '@repo/ui'
import { useTranslation } from 'react-i18next'
import { convertDateToString } from '@repo/utils'
import { moduleApis } from '@/apis'
import { useOrganizationStore } from '@repo/stores'

const DevicesTableInExpand = ({ data, noData, moduleRow }) => {
  const { t } = useTranslation('settings')
  const [processingDeviceId, setProcessingDeviceId] = useState(null)
  const [activatedDevices, setActivatedDevices] = useState(new Set())
  const { allOrgs, actualOrgs } = useOrganizationStore()

  const CdToggle = ({ device, onChange, disabled }) => {
    const isChecked = device.ModuleInfos[0]?.activateCI
    const toggleText = isChecked ? 'ON' : 'OFF'

    const handleChange = (e) => {
      onChange(device, e.target.checked)
    }

    return (
      <ToggleSwitch checked={isChecked} onChange={handleChange} label={toggleText} width="70px" disabled={disabled} />
    )
  }

  const handleCiChange = async (device, add) => {
    try {
      setProcessingDeviceId(device.id)
      await moduleApis.requestInfoActivateCi(moduleRow.id, [device.id], add)

      if (device.ModuleInfos && device.ModuleInfos.length > 0) {
        device.ModuleInfos[0].activateCI = add
      }

      setActivatedDevices((prev) => {
        const next = new Set(prev)
        if (add) {
          next.add(device.id)
        } else {
          next.delete(device.id)
        }
        return next
      })
    } catch (error) {
      console.error(`Failed to ${add ? 'activate' : 'deactivate'} CI for device`, device.displayName, error)
    } finally {
      setProcessingDeviceId(null)
    }
  }

  const findOrgIdByCode = (code) => {
    return allOrgs.find((org) => org.code === code)?.id
  }

  const isActivated = (row) => {
    return row.Cicds?.find((cicd) => cicd.organizationId === findOrgIdByCode(actualOrgs[0].code))?.enabled || false
  }

  const columns = [
    {
      name: t('deviceName', 'Device Name'),
      selector: (device) => device.displayName,
      sortable: 'true'
    },
    {
      name: t('autoDeploy', 'CI Activation'),
      selector: (device) => (
        <div style={{ display: 'flex', justifyContent: 'center' }}>
          {processingDeviceId === device.id ? (
            <Loading />
          ) : (
            <CdToggle device={device} onChange={handleCiChange} disabled={!isActivated(moduleRow)} />
          )}
        </div>
      ),
      sortable: 'true',
      sortFunction: (a, b) => {
        const aActivate = a.ModuleInfos[0]?.activateCI || false
        const bActivate = b.ModuleInfos[0]?.activateCI || false
        if (aActivate && !bActivate) {
          return -1
        }
        if (!aActivate && bActivate) {
          return 1
        }
        return 0
      }
    },
    {
      name: t('updatedAt', 'Updated At'),
      selector: (device) => (device.updatedAt ? convertDateToString(device.updatedAt) : '-'),
      sortable: 'true'
    }
  ]

  useEffect(() => {
    const initial = new Set()
    data.forEach((device) => {
      const moduleInfo = device.ModuleInfos[0]
      if (moduleInfo && isActivated(moduleInfo) && moduleInfo.Module.id === moduleRow.id) {
        initial.add(device.id)
      }
    })
    setActivatedDevices(initial)
  }, [data])

  return <Table data={data} columns={columns} pagination paginationRowsPerPageOptions={[10, 30, 50]} noData={noData} />
}

export default DevicesTableInExpand
