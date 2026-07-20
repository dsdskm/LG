import React, { useEffect, useCallback, useState } from 'react'
import { SectionRobot, Table } from '@repo/ui'
import { useTranslation } from 'react-i18next'
import { useUserStore } from '@repo/stores'
import { deviceApis } from '@/apis'
import { toYmdHmKST } from '@/utils/dateUtils'
import { getStatusInfo } from '@/utils/robotUtils'

const SiteRobotList = ({ siteId }) => {
  const { t } = useTranslation('robot')
  const { t: tCommon } = useTranslation('common')
  const { session } = useUserStore()
  const [devices, setDevices] = useState([])
  const [filteredDevices, setFilteredDevices] = useState([])

  const loadSiteRobotList = useCallback(
    async (searchParams = {}) => {
      try {
        const data = await deviceApis.getDevices({ siteId: siteId })
        //console.info('data :', data)
        setDevices(data.content)
        setTableList(data.content)
      } catch (err) {
        console.error('Error loadGetDevices:', err)
      } finally {
      }
    },
    [siteId]
  )

  function setTableList(tList) {
    let loopList = []
    for (var i = 0; i < tList.length; i++) {
      if (tList[i].provision.isDefaultSite || tList[i].provision?.siteId != siteId) {
        continue
      }
      tList[i].registeredAt = toYmdHmKST(tList[i].registeredAt)
      loopList.push(tList[i])
    }

    setFilteredDevices(loopList)
  }

  useEffect(() => {
    loadSiteRobotList()
  }, [])

  const columns = [
    {
      name: t('robotName'),
      selector: (row) => row.deviceName,
      sortable: true
    },
    {
      name: t('model'),
      selector: (row) => (row.deviceModelName ? row.deviceModelName : ''),
      sortable: true
    },
    {
      name: t('serialNumber'),
      selector: (row) => row.deviceSerialNumber,
      sortable: true
    },
    {
      name: t('ownMap'),
      selector: (row) => 0,
      sortable: true
    },
    {
      name: t('currentAffiliation'),
      selector: (row) =>
        !row.provision.isDefaultSite ? row.provision.groupName + ' > ' + row.provision.siteName : t('unassigned'),
      sortable: true
    },
    {
      name: t('registerStatus'),
      selector: (row) => row.deviceRegStatus ?? '', // 정렬용 원시값
      cell: (row) => {
        const { className, textKey } = getStatusInfo(row.deviceRegStatus ?? '')
        return <span className={`px-4 py-[3px] rounded-full text-[10px] ${className}`}>{t(textKey)}</span>
      },
      sortable: true
    }
  ]

  return (
    <>
      <SectionRobot style={{ maxWidth: '1600px' }}>
        <div style={{ margin: '16px 0', fontSize: '14px', fontWeight: 'bold' }}>
          {t('count')} : {filteredDevices.length}
        </div>

        <Table
          columns={columns}
          data={filteredDevices}
          noData={tCommon('noData')}
          pagination
          paginationRowsPerPageOptions={[10, 30, 50, 100]}
        />
      </SectionRobot>
    </>
  )
}

export default SiteRobotList
