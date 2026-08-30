import { StyledPageContent, Section, Title, Table } from '@repo/ui'
import { useEffect, useState } from 'react'
import ButtonRun from './ButtonRun'
import { useTranslation } from 'react-i18next'
import mockDevices from './mock.devices.json'

import { useEbmeRobots } from './hooks/useEbmeRobots'

const Robot = () => {
  const { t } = useTranslation(['robot'])

  const [filteredDevices, setFilteredDevices] = useState([])
  const [tempIsLoading, setTempIsLoading] = useState(false)
  const { robotList, readyState, isLoading } = useEbmeRobots('ws://localhost:9003')

  useEffect(() => {
    const loadData = async () => {
      try {
        setTempIsLoading(true)
        setFilteredDevices(mockDevices)
      } catch (err) {
      } finally {
        setTempIsLoading(false)
      }
    }
    loadData()
  }, [])

  useEffect(() => {
    console.log(`robot list loaded: ${JSON.stringify(robotList)}`)
  }, [robotList])

  useEffect(() => {
    console.log(`ebme socket status changed: ${readyState}`)
  }, [readyState])

  const handleClick = () => {}

  //TBD
  const temp_columns = () => {
    return {
      columns: [
        {
          name: t('robot_type_name'),
          selector: (row) => <p>가사 로봇</p>,
          sortable: true
        },
        {
          name: t('robot_name'),
          selector: (row) => row.deviceName,
          sortable: true
        },
        {
          name: t('log_viewer'),
          cell: (row) => <ButtonRun deviceId={handleClick}>{'open'}</ButtonRun>,
          sortable: true
        },
        {
          name: t('group'),
          selector: (row) => <p>{'L그룹'}</p>,
          sortable: true
        },
        {
          name: t('serial_number'),
          selector: (row) => row.serialNumber,
          sortable: true
        },
        {
          name: t('software_version'),
          selector: (row) => <p>{'0070'}</p>,
          sortable: true
        },
        {
          name: t('rabot_status'),
          selector: (row) => row.deviceStatus,
          sortable: true
        },
        {
          name: t('robot_update_date'),
          selector: (row) => <p>{'2090.01.01'}</p>,
          sortable: true
        }
      ],
      conditionalRowStyles: []
    }
  }

  //TBD
  const columns = () => {
    return {
      columns: [
        {
          name: t('robot_type_name'),
          selector: (row) => row.robot_type,
          sortable: true
        },
        {
          name: t('robot_name'),
          selector: (row) => row.nickname,
          sortable: true
        },
        {
          name: t('log_viewer'),
          cell: (row) => (
            <ButtonRun deviceId={row.device_id} robotName={row.nickname}>
              {'open'}
            </ButtonRun>
          ),
          sortable: false
        },
        {
          name: t('group'),
          selector: (row) => row.branch_name,
          sortable: true
        },
        {
          name: t('serial_number'),
          selector: (row) => row.device_id,
          sortable: true
        },
        {
          name: t('software_version'),
          selector: (row) => row.version,
          sortable: true
        },
        {
          name: t('rabot_status'),
          selector: (row) => row.main_state,
          sortable: true
        },
        {
          name: t('robot_update_date'),
          selector: (row) => row.time_stamp,
          sortable: true
        }
      ],
      conditionalRowStyles: []
    }
  }

  const handleRowClick = (row) => {
    console.log(row)
  }

  const isTempMode = () => {
    if (!robotList || robotList.length === 0) {
      return true
    }
    return false
  }
  return (
    <StyledPageContent className="column">
      <Title>{t('robot_management')}</Title>
      <Section>
        <Table
          columns={isTempMode() ? temp_columns().columns : columns().columns}
          data={isTempMode() ? filteredDevices : robotList}
          noData={'No Data'}
          isLoading={tempIsLoading || isLoading}
          pagination
          paginationRowsPerPageOptions={[10, 20, 30]}
          onRowClicked={handleRowClick}
          conditionalRowStyles={columns().conditionalRowStyles}
        />
      </Section>
    </StyledPageContent>
  )
}

export default Robot

