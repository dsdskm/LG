import React, { useState, useEffect } from 'react'
import { Table, StyledTag } from '@repo/ui'
import { useTranslation } from 'react-i18next'
import { convertDateToString } from '@repo/utils'
import { statusToBgColor, statusToColor } from '@/utils/common'
import { DEVICE_STATUS } from '@/constants/device'

const ModulesTableInExpand = ({ data: modules, noData }) => {
  const { t } = useTranslation('device')
  const [allModules, setAllModules] = useState(modules)

  useEffect(() => {
    setAllModules(modules || [])
  }, [modules])

  const columns = [
    {
      name: t('moduleName'),
      selector: (module) => module.displayName,
      sortable: 'true'
    },
    {
      name: t('version'),
      selector: (module) => module.Version?.displayName,
      sortable: 'true'
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
      sortable: 'true'
    },
    {
      name: t('updatedAt'),
      selector: (module) => (module.updatedAt ? convertDateToString(module.updatedAt) : '-'),
      sortable: 'true'
    }
  ]

  return (
    <Table data={allModules} columns={columns} pagination paginationRowsPerPageOptions={[10, 30, 50]} noData={noData} />
  )
}

export default ModulesTableInExpand
