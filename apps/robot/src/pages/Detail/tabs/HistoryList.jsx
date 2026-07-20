import React, { useEffect, useCallback, useState, useMemo } from 'react'
import { Table, SectionRobot as Section } from '@repo/ui'
import { useTranslation } from 'react-i18next'

const tempList = [
  {
    id: '1',
    user: 'admin@hcrsp.com',
    path: '재부팅 (Reboot)',
    startTime: '2026-05-12 09:15',
    endTime: '2026-05-12 09:18',
    status: 'closed'
  },
  {
    id: '2',
    user: 'ops@hcrsp.com',
    path: '비상 정지 (Emergency Stop)',
    startTime: '2026-05-12 10:22',
    endTime: '2026-05-12 10:23',
    status: 'closed'
  },
  {
    id: '3',
    user: 'admin@hcrsp.com',
    path: 'Map Settings',
    startTime: '2026-04-03 14:23',
    endTime: '2026-04-03 14:45',
    status: 'closed'
  },
  {
    id: '4',
    user: 'ops@hcrsp.com',
    path: 'POI Navigation',
    startTime: '2026-04-03 15:10',
    status: 'in_progress'
  }
]

const HistoryList = ({ t, deviceId }) => {
  const { t: tCommon } = useTranslation('common')
  const [historys, setHistorys] = useState([])
  const [filteredList, setFilteredList] = useState([])

  const loadHistoryList = useCallback(
    async (searchParams = {}) => {
      setHistorys(tempList)
      //   try {
      //     const data = await deviceApis.getDevices()
      //     console.info('data :', data)
      //     setHistorys(data.content)
      //     setTableList(data.content)
      //   } catch (err) {
      //     console.error('Error loadGetDevices:', err)
      //   } finally {
      //   }
    },
    [deviceId]
  )

  function setTableList(tList) {
    let loopList = []
    for (var i = 0; i < tList.length; i++) {
      loopList.push(tList[i])
    }

    setFilteredList(loopList)
  }

  useEffect(() => {
    loadHistoryList()
  }, [deviceId])

  const columns = [
    {
      name: t('user'),
      selector: (row) => row.user,
      sortable: true
    },
    {
      name: t('contorlEntryPath'),
      selector: (row) => row.path,
      sortable: true
    },
    {
      name: t('startEndtime'),
      selector: (row) => row.startTime,
      sortable: true
    },
    {
      name: t('state'),
      selector: (row) => row.status,
      sortable: true
    }
  ]

  return (
    <>
      <Section>
        <Table
          columns={columns}
          data={historys}
          noData={tCommon('noData')}
          pagination
          paginationRowsPerPageOptions={[10, 30, 50, 100]}
        />
      </Section>
    </>
  )
}

export default HistoryList
