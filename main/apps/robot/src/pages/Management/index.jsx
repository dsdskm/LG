import React, { useState, useEffect, useCallback, useMemo } from 'react'
import {
  StyledPageContent,
  SectionRobot,
  Title,
  Table,
  Search,
  HeaderTitleGroup,
  OrganizationSelector,
  SearchContainer,
  Dropdown
} from '@repo/ui'
import { P } from './styles'
import { useTranslation } from 'react-i18next'
import { deviceApis, groupApis, siteApis } from '@/apis'
import { toYmdHmKST } from '@/utils/dateUtils'
import { useModalState } from '@repo/hooks'
import ModalModifyRobot from './modal/ModalModifyRobot'
import ModalResult from './modal/ModalResult'
import { useNavigate } from 'react-router-dom'
import '../../index.css'
import { useAppContext } from '@/common/AppContext'
import { getStatusInfo, allRegStatus, allOperationStatus } from '@/utils/robotUtils'
import { robotStore } from '@/utils/robotStore'

const ALLVALUE = 'all'

const Management = () => {
  const [refreshKey, setRefreshKey] = useState(0)
  const { t } = useTranslation('robot')
  const [devices, setDevices] = useState([])
  const [filteredDevices, setFilteredDevices] = useState([])
  const isLoading = false
  const [deviceId, setDeviceId] = useState('')
  const [deviceName, setDeviceName] = useState('')
  const [deviceNameModResult, setDeviceNameModResult] = useState(false)
  const navigate = useNavigate()
  const [groupsSites, setGroupsSites] = useState([])
  const { selectedGroup, selectedSite } = useAppContext()
  const [orgFilter, setOrgFilter] = useState({ values: ['all', 'all'] })

  const [registrationStatusFilter, setRegistrationStatusFilter] = useState(ALLVALUE)
  const [operationStatusFilter, setOperationStatusFilter] = useState(ALLVALUE)
  const { deviceState, setDeviceState } = robotStore.getState()

  const handleSelectOrg = useCallback((info) => {
    setOrgFilter(info)
  }, [])

  function setTableList(tList) {
    let loopList = []
    for (var i = 0; i < tList.length; i++) {
      if (!tList[i].updatedAt) {
        tList[i].registeredAt = toYmdHmKST(tList[i].registeredAt)
      } else {
        tList[i].updatedAt = toYmdHmKST(tList[i].updatedAt)
      }
      loopList.push(tList[i])
    }

    setFilteredDevices(loopList)
  }

  const loadGetGroupsSites = useCallback(async (searchParams = {}) => {
    try {
      const data = await groupApis.getGroups({})
      //console.info('data :', data)
      //setGourps(data.content)
      const dataGourps = data.content

      const data2 = await siteApis.getSites({})
      //console.info('data2 :', data2)
      //setSites(data2.content)
      const dataSites = data2.content

      let _groupsSites = []
      for (let i = 0; i < dataGourps.length; i++) {
        let tempGroup = {}
        tempGroup.id = dataGourps[i].groupId
        tempGroup.name = dataGourps[i].groupName
        let _sites = []
        for (let j = 0; j < dataSites.length; j++) {
          if (dataSites[j].groupId == dataGourps[i].groupId) {
            let tempSite = {}
            tempSite.id = dataSites[j].siteId
            tempSite.name = dataSites[j].siteName
            _sites.push(tempSite)
          }
        }
        tempGroup.sites = _sites
        _groupsSites.push(tempGroup)
      }

      setGroupsSites(_groupsSites)
    } catch (err) {
      console.error('Error loadGetGroupsSites:', err)
    } finally {
    }
  }, [])

  const loadGetDevices = useCallback(async (searchParams = {}) => {
    try {
      const data = await deviceApis.getDevices()
      //console.info('data :', data)
      setDevices(data.content)

      if (deviceState != 'none') {
        setOperationStatusFilter(deviceState)
        setDeviceState('none')
      }
    } catch (err) {
      console.error('Error loadGetDevices:', err)
    } finally {
    }
  }, [])

  useEffect(() => {
    loadGetDevices()
  }, [loadGetDevices, refreshKey])

  const columeData = () => {
    return {
      columns: [
        {
          name: t('robotName'),
          selector: (row) =>
            row.deviceRegStatus === 'DELETED' ? (
              row.deviceName
            ) : (
              <a style={{ cursor: 'pointer' }} onClick={() => openModalModifyRobot(row.deviceId, row.deviceName)}>
                <u>{row.deviceName ? row.deviceName : t('noName')}</u>
              </a>
            ),
          sortable: true
        },
        {
          name: t('model'),
          selector: (row) => <P>{row.deviceModelName ?? 'no model'}</P>,
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
        },
        {
          name: t('operateStatus'),
          selector: (row) => row.deviceState ?? '', // 정렬용 원시값
          cell: (row) => {
            const { className, textKey } = getStatusInfo(row.deviceState ?? '')
            return <span className={`px-4 py-[3px] rounded-full text-[10px] ${className}`}>{t(textKey)}</span>
          },
          sortable: true
        },
        {
          name: t('group'),
          selector: (row) =>
            row.provision?.isDefaultSite != true && row.provision?.groupName ? (
              row.provision.groupName
            ) : (
              <P>{t('unassigned')}</P>
            ),
          sortable: true
        },
        {
          name: t('site'),
          selector: (row) =>
            row.provision?.isDefaultSite != true && row.provision?.siteName ? (
              row.provision.siteName
            ) : (
              <P>{t('unassigned')}</P>
            ),
          sortable: true
        },
        {
          name: t('serialNumber'),
          selector: (row) => (row.deviceSerialNumber ? row.deviceSerialNumber : <P>{'SN-00000000'}</P>),
          sortable: true
        },
        {
          name: t('macAddress'),
          selector: (row) => (row.deviceMacAddress ? row.deviceMacAddress : <P>{'00:00:00:00:00:00'}</P>),
          sortable: true
        },
        {
          name: t('finalUpdate'),
          selector: (row) => (!row.updatedAt ? row.registeredAt : row.updatedAt),
          sortable: true
        }
      ],
      conditionalRowStyles: []
    }
  }

  const handleRowClick = (row) => {
    console.log(row)
  }
  const [searchQuery, setSearchQuery] = useState('')
  const handleSearchChange = (e) => {
    setSearchQuery(e.target.value)
  }

  const handleResetClick = () => {
    setSearchQuery('')
  }

  const ModifyRobotModal = useModalState()
  const ResultModal = useModalState()

  const openModalModifyRobot = (_deviceId, _deviceName) => {
    navigate('./detail?deviceId=' + _deviceId)
  }

  const requestRenameRobotName = (data) => {
    ModifyRobotModal.onClose()
    openModalResult(data)
  }

  const openModalResult = (data) => {
    setDeviceNameModResult(data.resultYN)
    ResultModal.onOpen()
  }

  const refreshRobotList = () => {
    ResultModal.onClose()
    setRefreshKey((k) => k + 1)
  }

  useEffect(() => {
    filterTableList()
  }, [devices, orgFilter, searchQuery, registrationStatusFilter, operationStatusFilter])

  function filterTableList() {
    const filteredList = devices.filter((r) => {
      const matchGroup =
        // orgFilter.values[0] === 'all'
        //   ? true
        //   : orgFilter.values[0] === 'none'
        //     ? r.provision?.isDefaultSite
        //     : !r.provision?.isDefaultSite && r.provision?.groupId === orgFilter.values[0]
        orgFilter.values[0] === 'all' ? true : r.provision?.groupId === orgFilter.values[0]
      const matchSite =
        orgFilter.values[1] === 'all'
          ? true
          : orgFilter.values[1] === 'none' || orgFilter.actualOrgs[0]?.originalData?.isDefaultSite === true
            ? r.provision?.isDefaultSite
            : !r.provision?.isDefaultSite && r.provision?.siteId === orgFilter.values[1]

      const lowerQuery = searchQuery?.toLowerCase()
      const matchSearch =
        !searchQuery ||
        [r.deviceName, r.deviceSerialNumber, r.deviceMacAddress]
          .filter(Boolean)
          .some((v) => v.toLowerCase().includes(lowerQuery))

      const matchRegistrationStatus =
        registrationStatusFilter === ALLVALUE || r.deviceRegStatus === registrationStatusFilter
      const matchOperationStatus = operationStatusFilter === ALLVALUE || r.deviceState === operationStatusFilter

      return matchGroup && matchSite && matchSearch && matchRegistrationStatus && matchOperationStatus
    })

    setTableList(filteredList)
  }

  const regStatusOptions = useMemo(() => {
    return [
      { value: ALLVALUE, name: t('allRegisterStatus') },
      ...allRegStatus.map((r) => ({ value: r.value, name: t(r.token) }))
    ]
  }, [allRegStatus, t])

  const handleRegStatusChange = (value) => {
    setRegistrationStatusFilter(value)
  }

  const operationStatusOptions = useMemo(() => {
    return [
      { value: ALLVALUE, name: t('allOperationStatus') },
      ...allOperationStatus.map((r) => ({ value: r.value, name: t(r.token) }))
    ]
  }, [allRegStatus, t])

  const handleOperationStatusChange = (value) => {
    setOperationStatusFilter(value)
  }

  return (
    <>
      <StyledPageContent className="column">
        <Title>{t('robotList')}</Title>
        <OrganizationSelector
          onChange={handleSelectOrg}
          // supportAlls={[true, true]}
          supportNone={[false, false]}
          disableCenter
        />
        <SectionRobot>
          <HeaderTitleGroup>
            <SearchContainer>
              <Search
                value={searchQuery}
                onChange={handleSearchChange}
                onReset={handleResetClick}
                placeholder={t('robotNameSnMac')}
              />
            </SearchContainer>
            <Dropdown
              size="lg"
              minWidth="180px"
              defaultValue={registrationStatusFilter}
              options={regStatusOptions}
              onChange={handleRegStatusChange}
            />
            <Dropdown
              size="lg"
              minWidth="180px"
              value={operationStatusFilter}
              options={operationStatusOptions}
              onChange={handleOperationStatusChange}
            />
          </HeaderTitleGroup>
          <div style={{ margin: '16px 0', fontSize: '14px', fontWeight: 'bold' }}>
            {t('count')} : {filteredDevices.length}
          </div>
          <Table
            columns={columeData().columns}
            data={filteredDevices}
            noData={'No Data'}
            isLoading={isLoading}
            pagination
            paginationRowsPerPageOptions={[10, 20, 30]}
            onRowClicked={handleRowClick}
            conditionalRowStyles={columeData().conditionalRowStyles}
          />
        </SectionRobot>
      </StyledPageContent>
      <ModalModifyRobot
        isOpen={ModifyRobotModal.isOpen}
        onClose={ModifyRobotModal.onClose}
        onConfirm={requestRenameRobotName}
        t={t}
        deviceId={deviceId}
        deviceName={deviceName}
      />
      <ModalResult
        isOpen={ResultModal.isOpen}
        onClose={ResultModal.onClose}
        onConfirm={refreshRobotList}
        t={t}
        resultYN={deviceNameModResult}
      />
    </>
  )
}

export default Management
