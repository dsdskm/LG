import React, { useState, useEffect } from 'react'
import { Table, StyledTag } from '@repo/ui'
import { useTranslation } from 'react-i18next'
import { convertDateToString } from '@repo/utils'
import { statusToBgColor, statusToColor } from '@/utils/common'
import { DEVICE_STATUS } from '@/constants/device'
import { deviceApis } from '@/apis'

const ModulesTableInExpand = ({ deviceId, noData }) => {
  console.log('deviceId', deviceId)
  const { t } = useTranslation('device')
  const [allModules, setModules] = useState([])

  useEffect(() => {
    const fetchModules = async () => {
      const response = await deviceApis.retrieveDeviceStatus(deviceId)
      console.log('response', response)
      setModules(JSON.parse(response.state.sWmodules) || [])
    }
    fetchModules()
  }, [])

  const columns = [
    {
      name: t('moduleName'),
      selector: (module) => module.name,
      sortable: 'true'
    },
    {
      name: t('version'),
      selector: (module) => module.version.split(':')[1],
      sortable: 'true',
      grow: 1.5
    },
    {
      name: t('status'),
      selector: (module) => (
        <div style={{ display: 'flex' }}>
          <StyledTag
            color={statusToColor(module.status || DEVICE_STATUS.NO_RESPONSE)}
            bgColor={statusToBgColor(module.status || DEVICE_STATUS.NO_RESPONSE)}
          >
            {module.status || DEVICE_STATUS.NO_RESPONSE}
          </StyledTag>
        </div>
      ),
      sortable: 'true',
      grow: 0.5
    },
    {
      name: t('updatedAt'),
      selector: (module) => (module.lastCheck ? convertDateToString(module.lastCheck) : '-'),
      sortable: 'true'
    }
  ]

  return (
    <Table data={allModules} columns={columns} pagination paginationRowsPerPageOptions={[10, 30, 50]} noData={noData} />
  )
}

export default ModulesTableInExpand
