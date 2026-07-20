import React, { useEffect, useCallback, useState, useMemo } from 'react'
import { SectionRobot, Table, Button } from '@repo/ui'
import { useTranslation } from 'react-i18next'
import { useUserStore } from '@repo/stores'
import { deviceApis } from '@/apis'
import { toYmdHmKST } from '@/utils/dateUtils'
import { toast } from 'react-toastify'
import { getStatusInfo } from '@/utils/robotUtils'

const UnsignedList = ({ siteId }) => {
  const { t } = useTranslation('robot')
  const { t: tCommon } = useTranslation('common')
  const { session } = useUserStore()
  const [devices, setDevices] = useState([])
  const [filteredDevices, setFilteredDevices] = useState([])
  const [selectedRows, setSelectedRows] = useState([])
  const [clearSelectedToggle, setClearSelectedToggle] = useState(false)

  const loadUnsignedList = useCallback(
    async (searchParams = {}) => {
      try {
        const data = await deviceApis.getDevices()
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
      if (!tList[i].provision?.isDefaultSite) {
        continue
      }
      tList[i].registeredAt = toYmdHmKST(tList[i].registeredAt)
      loopList.push(tList[i])
    }

    setFilteredDevices(loopList)
  }

  useEffect(() => {
    loadUnsignedList()
  }, [])

  const selectedDeviceIds = useMemo(() => {
    return (selectedRows || []).map((r) => r.deviceId).filter(Boolean)
  }, [selectedRows])

  const handleSelectedRowsChange = useCallback((state) => {
    // react-data-table-component 기준: state.selectedRows
    setSelectedRows(state?.selectedRows ?? [])
  }, [])

  const sendSelectedDeviceIds = useCallback(async () => {
    if (!selectedDeviceIds.length) return

    try {
      for (let i = 0; i < selectedDeviceIds.length; i++) {
        await deviceApis.putDeviceAssignment(selectedDeviceIds[i], { siteId: siteId })
      }

      toast.success(t('사이트 배정이 완료되었습니다.'), { autoClose: 2000 })

      // 성공 시: 리스트 새로고침 + 선택 해제
      await loadUnsignedList()
      setSelectedRows([])
      setClearSelectedToggle((prev) => !prev)
    } catch (err) {
      console.error('Error sendSelectedDeviceIds:', err)
    }
  }, [selectedDeviceIds, loadUnsignedList])

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
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', margin: '16px 0' }}>
          <div style={{ fontSize: '14px', fontWeight: 'bold' }}>
            {t('count')} : {filteredDevices.length}
            <span style={{ marginLeft: 12 }}>
              {t('selection')} : {selectedDeviceIds.length}
            </span>
          </div>

          <Button onClick={sendSelectedDeviceIds} disabled={!selectedDeviceIds.length}>
            {t('siteAssign')}
          </Button>
        </div>

        <Table
          columns={columns}
          data={filteredDevices}
          noData={tCommon('noData')}
          pagination
          paginationRowsPerPageOptions={[10, 30, 50, 100]}
          selectableRows
          selectableRowsHighlight
          onSelectedRowsChange={handleSelectedRowsChange}
          clearSelectedRows={clearSelectedToggle}
        />
      </SectionRobot>
    </>
  )
}

export default UnsignedList
