import React, { useState, useCallback, useEffect, useRef } from 'react'
import { Table, Modal, Button, ExpandableSection, SectionRobot as Section } from '@repo/ui'
import { toYmdHmKST } from '@/utils/dateUtils'
import { parseDeviceInfo, parseRobotData, getLocalizedName, getWifiStatus } from '@/utils/robotUtils'
import { EditButton, PlayButton, StopButton, LiveSpan } from '@/utils/style'
import { SectionList, ControlDiv, ControlBtn } from '../styles'
import { useModalState } from '@repo/hooks'
import { deviceApis, mapApis } from '@/apis'
import ModalEditRobot from '../modal/ModalEditRobot'
import ModalMoveLocation from '../modal/ModalMoveLocation.jsx'
import { useTranslation } from 'react-i18next'
import { useUserStore } from '@repo/stores'
// import SiteMap from '../../../common/SiteMap'
import SiteMap3D from '../../../common/SiteMap3D'
import PartsStatusPanel from '../component/PartsStatusPanel'
import {
  Play,
  GamePad,
  Battery,
  Wifi,
  Clock,
  Upload,
  OperationStatus,
  RotateCcw,
  PowerOff,
  PlayCircle,
  StopCircle,
  AlertOctagon,
  PauseCircle,
  BatteryCharging,
  Navigation
} from '@/assets/icon'

// sitePosition(건물/층/영역) 식별 키 — 값이 바뀌면 해당 위치의 지도를 다시 로딩
const sitePosKey = (sp) => (sp?.buildingId ? `${sp.buildingId}/${sp.floorId}/${sp.areaId}` : null)

const AssetInfo = ({ t, deviceId }) => {
  const EditRobotModal = useModalState()
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false)
  const [deviceInfo, setDeviceInfo] = useState({})
  const [confirmMessage, setConfirmMessage] = useState('')
  const [robotErrors, setRobotErrors] = useState([])
  const [mapData, setMapData] = useState({})
  const [robotDatas, setRobotDatas] = useState([])
  const [robotState, setRobotState] = useState({})
  const [showMap, setShowMap] = useState(false)
  const [mapServer, setMapServer] = useState({})
  const { t: tCommon, i18n } = useTranslation('common')
  const MoveLocationModal = useModalState()
  const { session } = useUserStore()
  const [isLive, setIsLive] = useState(false)
  const liveIntervalRef = useRef(null)
  const prevSitePosRef = useRef(null) // 마지막으로 지도를 로딩한 sitePosition 키
  const pollCacheRef = useRef({
    updatedAt: null,
    st: null, // state.stateUpdatedAt
    conn: null, // connection.connectionUpdatedAt
    hwTs: null,
    senTs: null,
    swTs: null
  })

  useEffect(() => {
    loadDeviceInfo()
  }, [])

  function getStatus(status, target) {
    let className = ''
    let text = ''
    switch (status) {
      case 'OPERATION':
        text = t('operation')
        break
      case 'STANDBY':
        text = t('wait')
        break
      case 'CHARGE':
        text = t('charge')
        break
      case 'ERROR':
        text = t('error')
        break
      case 'OFFLINE':
        text = t('offline')
        break
      case 'REGISTERED':
        text = t('register')
        break
      case 'ACTIVE':
        text = t('active')
        break
      case 'DELETE':
        text = t('delete')
        break
      default:
        text = t('noData')
        break
    }

    if (target == 'badge') {
      return className
    } else if (target == 'text') {
      return text
    }
  }

  const loadDeviceInfo = useCallback(async (searchParams = {}) => {
    setShowMap(false)
    try {
      const data = await deviceApis.getDeviceInfo(deviceId)
      setDeviceInfo({
        ...parseDeviceInfo(data),
        wifi: getWifiStatus(data.state)
      })
      setRobotDatas([parseRobotData(data)])
      setRobotState(data?.state)

      const provisionData = data.provision
      const sp = data.state?.sitePosition
      // 맵은 device/area 단위로만 존재 → sitePosition(area) 없으면 조회하지 않음
      if (provisionData && !provisionData.isDefaultSite && sp) {
        prevSitePosRef.current = sitePosKey(sp)
        getMapUrl(provisionData, sp)
      } else {
        setShowMap(false)
      }
    } catch (err) {
      console.error('Error loadDeviceInfo:', err)
    } finally {
    }
  }, [])

  const getMapUrl = useCallback(async (provisionData, sitePosition) => {
    // 맵은 area 단위로만 존재하며, 조회 시 상위 buildingId/floorId를 반드시 함께 전달해야 함.
    if (!sitePosition?.areaId || !sitePosition?.buildingId || !sitePosition?.floorId) {
      setShowMap(false)
      return
    }
    try {
      const params = {
        groupId: provisionData.groupId,
        siteId: provisionData.siteId,
        buildingId: sitePosition.buildingId,
        floorId: sitePosition.floorId,
        areaId: sitePosition.areaId
      }
      const data = await mapApis.getMapViewFind(params)
      let type = 'png'
      let url = ''
      if (data.mapServer?.navi?.svgDownloadUrl) {
        type = 'svg'
        url = data.mapServer.navi.svgDownloadUrl
      } else {
        url = data.mapServer.navi.pngDownloadUrl
      }
      setMapData({
        type: type,
        url: url
      })
      setShowMap(true) // 성공한 경우에만 표시
      setMapServer(data.mapServer)
    } catch (err) {
      console.error('Error getMapUrl:', err)
    } finally {
    }
  }, [])

  const openModalEditRobot = () => {
    EditRobotModal.onOpen()
  }

  const conformModalEditRobot = (result) => {
    EditRobotModal.onClose()
    setConfirmMessage(result?.resultNo == 2 ? t('chanegRobotName') : t('errorReport'))
    setIsConfirmModalOpen(true)
  }

  const conformModal = () => {
    setIsConfirmModalOpen(false)
    loadDeviceInfo()
  }

  const handleLogPlayClick = () => {
    if (!deviceId) return
    const popup = window.open('../logreplay?deviceId=' + deviceId, '_blank', 'noopener,noreferrer')
  }

  const handleClick = () => {
    if (!deviceId) return
    const popup = window.open('../ReplayControls?deviceId=' + deviceId, '_blank', 'noopener,noreferrer')
  }

  const errorColumns = [
    {
      name: t('occurDate'),
      selector: (row) => (row.erroredAt ? toYmdHmKST(row.erroredAt) : '-'),
      sortable: true
    },
    {
      name: t('errorCode'),
      selector: (row) => row.errorCode,
      sortable: true
    },
    {
      name: t('errorDetail'),
      selector: (row) => row.errorTitle,
      sortable: true,
      width: '60%',
      wrap: true
    },
    {
      name: t('recoverySatus'),
      selector: (row) => (
        <span style={{ color: row.isRecovered ? '#16a34a' : '#dc2626' }}>
          {row.isRecovered ? t('complete') : t('imcomplete')}
        </span>
      ),
      sortable: true
    },
    {
      name: t('recoveryDate'),
      selector: (row) => (row.recoveredAt ? toYmdHmKST(row.recoveredAt) : '-'),
      sortable: true
    }
  ]

  useEffect(() => {
    if (deviceId) {
      loadErrorList()
    }
  }, [deviceId])

  const loadErrorList = useCallback(
    async (searchParams = {}) => {
      try {
        const data = await deviceApis.getDeviceErrors(deviceId)
        //console.info('data :', data)
        setRobotErrors(data.content)
      } catch (err) {
        console.error('Error loadGetDevices:', err)
      } finally {
      }
    },
    [deviceId]
  )

  const handleMoveLocation = useCallback(
    async (poi) => {
      const params = {
        userId: session?.userId,
        actions: [
          {
            actionType: 'move',
            actionId: crypto.randomUUID(),
            blockingType: 'NONE',
            actionParameters: [
              {
                key: 'poi_id',
                value: poi.poiId
              }
            ]
          }
        ]
      }

      try {
        await deviceApis.postInstanceActions(deviceId, params)
        const poiName = getLocalizedName(poi.name, i18n.language) || poi.poiId
        setConfirmMessage(`${poiName} ${t('moveCommandSent')}`)
        setIsConfirmModalOpen(true)
      } catch (err) {
        console.error('장소 이동 명령 실패:', err)
        setConfirmMessage(t('errorReport'))
        setIsConfirmModalOpen(true)
      }
    },
    [deviceId, session?.userId]
  )

  const isOnline = deviceInfo.state && deviceInfo.state != 'OFFLINE'

  const handleRobotAction = async (action) => {
    if (!isOnline && action !== 'reboot' && action !== 'shutdown') {
      alert(t('offlineStatue'))
      return
    }

    if (action === 'go_charging') {
      const params = {
        userId: session?.userId,
        actions: [
          {
            actionType: 'goCharging',
            actionId: crypto.randomUUID(),
            blockingType: 'NONE'
          }
        ]
      }
      try {
        await deviceApis.postInstanceActions(deviceId, params)
        setConfirmMessage(t('chargingStationMoveSent'))
        setIsConfirmModalOpen(true)
      } catch (err) {
        console.error('충전소 이동 명령 실패:', err)
        setConfirmMessage(t('errorReport'))
        setIsConfirmModalOpen(true)
      }
      return
    }

    console.log(`Robot action: ${action}`)
    alert(`${action} ` + t('sendCommand'))
  }

  // 3초마다 실행할 polling 함수 (mapUrl 갱신 제외)
  const pollDeviceInfo = useCallback(async () => {
    try {
      const data = await deviceApis.getDeviceInfo(deviceId)
      if (!data) return
      const c = pollCacheRef.current

      const st = data.state?.stateUpdatedAt ?? null
      const conn = data.connection?.connectionUpdatedAt ?? null

      // 최상위 변경 없음 → 아무것도 갱신하지 않음 (불필요 리렌더 차단)
      if (data.updatedAt === c.updatedAt && st === c.st && conn === c.conn) return

      // 상단 정보(이름/배터리/상태/위치)는 변경 시 갱신
      setDeviceInfo({
        ...parseDeviceInfo(data),
        wifi: getWifiStatus(data.state)
      })
      setRobotDatas([parseRobotData(data)])

      // PartsStatusPanel용 robotState는 hw/sen/sw 타임스탬프가 바뀐 경우에만 갱신
      const hwTs = data.state?.hwComponentsUpdatedAt ?? null
      const senTs = data.state?.sensorsUpdatedAt ?? null
      const swTs = data.state?.sWmodulesUpdatedAt ?? null
      if (hwTs !== c.hwTs || senTs !== c.senTs || swTs !== c.swTs) {
        setRobotState(data.state)
        c.hwTs = hwTs
        c.senTs = senTs
        c.swTs = swTs
      }

      c.updatedAt = data.updatedAt
      c.st = st
      c.conn = conn

      // 지도(sitePosition) 갱신 — 기존과 동일
      const sp = data.state?.sitePosition
      const key = sitePosKey(sp)
      const provisionData = data.provision
      if (key && key !== prevSitePosRef.current && provisionData && !provisionData.isDefaultSite) {
        prevSitePosRef.current = key
        getMapUrl(provisionData, sp)
      }
    } catch (err) {
      console.error('Error pollDeviceInfo:', err)
    }
  }, [deviceId, getMapUrl])

  const handleLivePlay = () => {
    setIsLive(true)
    liveIntervalRef.current = setInterval(pollDeviceInfo, 1000)
  }

  const handleLiveStop = () => {
    setIsLive(false)
    if (liveIntervalRef.current) {
      clearInterval(liveIntervalRef.current)
      liveIntervalRef.current = null
    }
  }

  // 컴포넌트 언마운트 시 interval 정리
  useEffect(() => {
    return () => {
      if (liveIntervalRef.current) {
        clearInterval(liveIntervalRef.current)
      }
    }
  }, [])

  return (
    <>
      <div className="flex flex-col gap-4">
        <ExpandableSection
          header={
            <div>
              <span>{deviceInfo.name}</span>
              <span style={{ marginLeft: 5 }}>{t('assetInfo')}</span>
              <span style={{ marginLeft: 15 }}>MAC: {deviceInfo.mac}</span>
              <span style={{ marginLeft: 5 }}>|</span>
              <span style={{ marginLeft: 5 }}>S/W: {deviceInfo.version}</span>
            </div>
          }
          expandedHeader={
            <div>
              <span>{deviceInfo.name}</span>
              <span style={{ marginLeft: 5 }}>{t('assetInfo')}</span>
            </div>
          }
        >
          <Section>
            <Table
              className="no-table-head"
              noTableHead
              columns={[
                {
                  name: 'label',
                  cell: (row) => (
                    <div style={{ fontSize: '14px' }}>
                      <span>{row.label}</span>
                    </div>
                  )
                },
                {
                  name: 'value',
                  cell: (row) => (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px' }}>
                      <span>{row.value}</span>
                      {row.editable && (
                        <EditButton type="button" onClick={openModalEditRobot}>
                          {t('modify')}
                        </EditButton>
                      )}
                    </div>
                  )
                }
              ]}
              data={[
                { label: t('robotName'), value: deviceInfo.name, editable: true },
                { label: t('model'), value: deviceInfo.model ?? 'no model' },
                {
                  label: t('group'),
                  value: deviceInfo.groupName ? deviceInfo.groupName : t('unassigned')
                },
                {
                  label: t('site'),
                  value: deviceInfo.siteName ? deviceInfo.siteName : t('unassigned')
                },
                { label: t('swVersion'), value: deviceInfo.version ?? '' },
                {
                  label: 'Serial Number',
                  value: deviceInfo.serial ?? '',
                  copyable: true
                },
                {
                  label: 'MAC Address',
                  value: deviceInfo.mac ?? '',
                  copyable: true
                },
                {
                  label: t('registerDate'),
                  value: deviceInfo.registerDate ? toYmdHmKST(deviceInfo.registerDate) : '-'
                }
              ]}
            />
          </Section>
        </ExpandableSection>
        <Section gap="1rem">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <label className="typographyBody4" style={{ fontWeight: 'bold' }}>
                {t('statusSummary')}
              </label>
              {isLive && <LiveSpan>Live</LiveSpan>}
            </div>
            {isLive ? (
              <StopButton style={{ maxHeight: '25px' }} onClick={handleLiveStop}>
                <StopCircle className="w-[14px] h-[14px]" /> {t('stop')}
              </StopButton>
            ) : (
              <PlayButton style={{ maxHeight: '25px' }} onClick={handleLivePlay}>
                <Play className="w-[14px] h-[14px]" /> {t('realtime')}
              </PlayButton>
            )}
          </div>
          <SectionList>
            {[
              {
                icon: Battery,
                label: t('batterySocSoh'),
                value:
                  (deviceInfo.batterySoc ? deviceInfo.batterySoc + '%' : '-') +
                  ' / ' +
                  (deviceInfo.batterySoh ? deviceInfo.batterySoh + '%' : '-')
                //warn: robot.battery <= 30
              },
              {
                icon: Wifi,
                label: t('network'),
                value: t(deviceInfo.wifi?.label ?? 'noData'),
                warn: deviceInfo.wifi?.warn ?? false
              },
              {
                icon: OperationStatus,
                label: t('operateStatus'),
                value: getStatus(deviceInfo.state ?? '', 'text'),
                warn: deviceInfo.state == 'ERROR'
              },
              {
                icon: Clock,
                label: t('finalUpdate'),
                value: deviceInfo.updateDate ? toYmdHmKST(deviceInfo.updateDate) : '-',
                warn: false
              }
            ].map((item, index) => (
              <Section key={item.label ?? index} className="gap-1.5">
                <div className="mb-10">
                  <item.icon />
                  <span className="ml-5">{item.label}</span>
                </div>
                <span className={`ml-10 ${item.warn ? 'text-[#dc2626]' : 'text-[#333]'}`}>{item.value}</span>
              </Section>
            ))}
          </SectionList>
        </Section>
        {showMap && (
          <Section className="mt-8">
            <div>
              <label className="typographyBody4" style={{ fontWeight: 'bold' }}>
                {t('currentLocation')}
              </label>
              {isLive && <LiveSpan>Live</LiveSpan>}
            </div>
            <div className="mt-4">
              <SiteMap3D mapData={mapData} robotDatas={robotDatas} mapServer={mapServer} />
            </div>
          </Section>
        )}
        <Section className="mt-8">
          <label className="typographyBody4" style={{ fontWeight: 'bold' }}>
            {t('magorAction')}
          </label>
          <div className="mt-5 flex flex-wrap gap-2 sm:gap-2.5">
            <Button theme={'primary'} onClick={handleLogPlayClick}>
              <Play className="w-[14px] h-[14px]" /> {t('drivingLogReplay')}
            </Button>
            <Button theme={'primary'} onClick={handleClick}>
              <GamePad className="w-[14px] h-[14px]" /> {t('manipulationLogReplay')}
            </Button>
            <Button theme={'primary'}>
              <Upload className="w-[14px] h-[14px]" /> {t('logUploadRequest')}
            </Button>
          </div>
        </Section>
        <Section className="mt-8">
          <label className="typographyBody4" style={{ fontWeight: 'bold' }}>
            {t('robotControl')}
          </label>
          <ControlDiv style={{ marginTop: '1.25rem' }}>
            <ControlBtn onClick={() => handleRobotAction('reboot')}>
              <RotateCcw className="w-[14px] h-[14px]" />
              {t('reboot')}
            </ControlBtn>
            <ControlBtn onClick={() => handleRobotAction('shutdown')}>
              <PowerOff className="w-[14px] h-[14px]" />
              {t('powerEnd')}
            </ControlBtn>
            <ControlBtn onClick={() => handleRobotAction('start')} disabled={!isOnline}>
              <PlayCircle className="w-[14px] h-[14px]" />
              {t('start')}
            </ControlBtn>
            <ControlBtn onClick={() => handleRobotAction('stop')} disabled={!isOnline}>
              <StopCircle className="w-[14px] h-[14px]" />
              {t('stop')}
            </ControlBtn>
            <ControlBtn onClick={() => handleRobotAction('emergency_stop')} disabled={!isOnline} $danger>
              <AlertOctagon className="w-[14px] h-[14px]" />
              {t('emergencyStop')}
            </ControlBtn>
            <ControlBtn onClick={() => handleRobotAction('pause_task')} disabled={!isOnline}>
              <PauseCircle className="w-[14px] h-[14px]" />
              {t('workTempStop')}
            </ControlBtn>
            <ControlBtn onClick={() => handleRobotAction('resume_task')} disabled={!isOnline}>
              <PlayCircle className="w-[14px] h-[14px]" />
              {t('workReume')}
            </ControlBtn>
            <ControlBtn onClick={() => handleRobotAction('go_charging')} disabled={!isOnline}>
              <BatteryCharging className="w-[14px] h-[14px]" />
              {t('chargeStationMove')}
            </ControlBtn>
            <ControlBtn onClick={MoveLocationModal.onOpen} disabled={!showMap} $info>
              <Navigation className="w-[14px] h-[14px]" />
              {t('locationMove')}
            </ControlBtn>
          </ControlDiv>
        </Section>
        <Section>
          <label className="typographyBody4" style={{ fontWeight: 'bold' }}>
            {t('recentErrorSummary')}
          </label>
          <div style={{ marginTop: '1.25rem' }}>
            <Table
              columns={errorColumns}
              data={robotErrors}
              noData={tCommon('noData')}
              pagination
              paginationRowsPerPageOptions={[10, 30, 50, 100]}
            />
          </div>
        </Section>
        <Section>
          <div>
            <label className="typographyBody4" style={{ fontWeight: 'bold' }}>
              {t('partsStatus')}
            </label>
            {isLive && <LiveSpan>Live</LiveSpan>}
          </div>
          <div style={{ marginTop: '1.25rem' }}>
            <PartsStatusPanel robotState={robotState} />
          </div>
        </Section>
      </div>

      <ModalEditRobot
        isOpen={EditRobotModal.isOpen}
        onClose={EditRobotModal.onClose}
        onConfirm={conformModalEditRobot}
        t={t}
        deviceId={deviceId}
        deviceInfo={deviceInfo}
      />
      <Modal
        isOpen={isConfirmModalOpen}
        size="xs"
        onClose={() => setIsConfirmModalOpen(false)}
        renderButtonComponent={
          <div style={{ display: 'flex', gap: '1rem', width: '100%', justifyContent: 'center' }}>
            <Button variant="contained" theme="primary" onClick={conformModal}>
              {t('confirm')}
            </Button>
          </div>
        }
      >
        <div style={{ textAlign: 'center', padding: '20px 0' }}>
          <p className="typographyBody2" style={{ whiteSpace: 'pre-wrap', textAlign: 'center' }}>
            {confirmMessage}
          </p>
        </div>
      </Modal>
      <ModalMoveLocation
        isOpen={MoveLocationModal.isOpen}
        onClose={MoveLocationModal.onClose}
        onConfirm={handleMoveLocation}
        mapServer={mapServer}
        t={t}
        lang={i18n.language}
      />
    </>
  )
}

export default AssetInfo
