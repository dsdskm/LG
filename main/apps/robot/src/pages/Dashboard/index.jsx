import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import styled from 'styled-components'
import { SectionRobot, Title, OrganizationSelector, NoData } from '@repo/ui'
import {
  DashboardWrapper,
  DashboardControlsContainer,
  DashboardButtonGroup,
  DashSection,
  DivPageBody,
  DivDashState,
  DivSectionTitle,
  DivSectionTitleWrap,
  H3SectionTitle,
  DivMarginTop,
  DivMapCard,
  DivDashAlarmTable,
  SectionMap,
  PlayButton,
  StopButton,
  LiveSpan,
  CollapsibleSectionHeader,
  CollapsibleChevron,
  CollapsibleBody,
  InspectionWrapper
} from './styles'
import { deviceApis, siteApis, mapApis } from '@/apis'
import { useNavigate } from 'react-router-dom'
import { robotStore } from '@/utils/robotStore'
import { parseRobotData, buildDeviceMerger } from '@/utils/robotUtils'

import Location from './KakaoMap'
import LocationGoogle from './GoogleMap'
import TableAlarm from './AlarmTable'
import SiteMap3D, { DASHBOARD_MAP_VIEW_KEY } from '../../common/SiteMap3D'
import LocationSelector from '../../common/LocationSelector'
import DataCollectionSection from './components/DataCollectionSection'
import RobotStateCards from './components/RobotStateCards'
import { Play, Stop } from '@/assets/icon'
import { useUserStore } from '@repo/stores'

const MapRegionToggle = styled.div`
  display: flex;
  height: 28px;
  margin-left: auto;
  margin-bottom: 1.3rem;
  border: 1px solid var(--color-secondary-20, #ddd);
  border-radius: 6px;
  overflow: hidden;
  flex-shrink: 0;
`

const MapRegionToggleBtn = styled.button`
  font-size: 1.2rem;
  padding: 0 0.8rem;
  height: 100%;
  border: none;
  border-right: ${({ $pos }) => ($pos === 'left' ? '1px solid var(--color-secondary-20, #ddd)' : 'none')};
  background: ${({ $on }) => ($on ? 'var(--color-primary-60, #0073e6)' : 'transparent')};
  color: ${({ $on }) => ($on ? '#fff' : 'var(--color-secondary-60, #555)')};
  cursor: pointer;
  white-space: nowrap;
  transition: background 0.15s, color 0.15s;
`

// 층 순서: floorIndex 1 이상 오름차순 → 0 이하 내림차순
const orderFloorsAsc = (floors = []) => {
  const above = floors.filter((f) => (f.floorIndex ?? 0) >= 1).sort((a, b) => (a.floorIndex ?? 0) - (b.floorIndex ?? 0))
  const below = floors.filter((f) => (f.floorIndex ?? 0) <= 0).sort((a, b) => (b.floorIndex ?? 0) - (a.floorIndex ?? 0))
  return [...above, ...below]
}

// 로봇이 가장 많은 영역 선택. 동률이면 빌딩 목록순 → 층(위 순서) → 영역 목록순의 최초 영역.
const pickMaxRobotArea = (buildings = [], areaCounts = {}) => {
  let best = null
  let bestCount = -1
  buildings.forEach((b) => {
    orderFloorsAsc(b.floors || []).forEach((f) => {
      ;(f.areas || []).forEach((a) => {
        const c = areaCounts[a.areaId] ?? 0
        if (c > bestCount) {
          bestCount = c
          best = { buildingId: b.buildingId, floorId: f.floorId, areaId: a.areaId }
        }
      })
    })
  })
  return best
}

const Dashboard = () => {
  const navigate = useNavigate()
  const { session } = useUserStore()

  // TERM_MANAGER는 대시보드 접근 불가 → 렌더/데이터 로딩 전에 즉시 리다이렉트
  useEffect(() => {
    if (session?.userRole === 'TERM_MANAGER') {
      navigate('/robot/terms', { replace: true })
    }
  }, [session?.userRole, navigate])

  if (session?.userRole === 'TERM_MANAGER') {
    return null
  }

  const { t } = useTranslation('robot')
  const [markers, setMarkers] = useState([])
  const [devices, setDevices] = useState([])
  const [devicesLoaded, setDevicesLoaded] = useState(false) // areaCounts가 실제 로봇 수를 반영하기 전엔 자동 영역 선택을 미룸
  const [sites, setSites] = useState([])
  const [orgFilter, setOrgFilter] = useState({ values: ['all', 'all'] })
  const [deviceCount, setDeviceCount] = useState({ opr: 0, lrn: 0, sta: 0, chr: 0, err: 0, off: 0 })
  const [useImageMap, setUseImageMap] = useState(false)
  const [mapRegion, setMapRegion] = useState('DOMESTIC') // 사이트 미선택(전체) 지도에서 국내(Kakao)/해외(Google) 전환
  const [isLiveImageMap, setIsLiveImageMap] = useState(false)
  const [inspectionCollapsed, setInspectionCollapsed] = useState(false)
  const { setDeviceState } = robotStore.getState()
  const [mapData, setMapData] = useState({})
  const [mapServer, setMapServer] = useState({})
  const [robotDatas, setRobotDatas] = useState([])
  // 사이트 하위 건물/층/영역 계층 및 선택 상태
  const [buildings, setBuildings] = useState([])
  const [locSel, setLocSel] = useState({ buildingId: '', floorId: '', areaId: '' })
  const liveIntervalRef = useRef(null)
  const deviceTsRef = useRef({}) // deviceId → { updatedAt, st, conn } 마지막 폴링 타임스탬프
  const buildingsSiteIdRef = useRef(null) // 현재 buildings가 어느 siteId 응답인지 추적

  // 선택된 사이트가 isDefaultSite=true인 경우 → 권역별 지도 표시
  const isDefaultSiteSelected =
    orgFilter.values[1] !== 'all' &&
    //orgFilter.values[1] !== 'none' &&
    sites.find((s) => s.siteId === orgFilter.values[1])?.isDefaultSite === true

  function makeMarker() {
    const siteMap = new Map()

    devices.forEach((device) => {
      // const siteId =
      //   device.provision?.isDefaultSite != true && device.provision?.siteName ? device.provision.siteId : null
      const siteId = device.provision?.siteName ? device.provision.siteId : null
      if (!siteId) return

      const site = sites.find((s) => s.siteId === siteId)
      if (!site) return
      if (!site.siteLatitude || !site.siteLongitude) return

      // 미배정 그룹 선택 시 표시할 사이트 마커 없음
      //if (orgFilter.values[0] === 'none') return
      if (orgFilter.values[0] !== 'all' && orgFilter.values[0] !== site.groupId) return
      // 미배정(none) 또는 isDefaultSite 사이트 선택 시 전체 사이트 마커 표시 → 권역별 지도
      if (
        orgFilter.values[1] !== 'all' &&
        //orgFilter.values[1] !== 'none' &&
        orgFilter.values[1] !== site.siteId
      )
        return

      const state = {
        operation: device.deviceState === 'OPERATION' ? 1 : 0,
        wait: device.deviceState === 'STANDBY' ? 1 : 0,
        charge: device.deviceState === 'CHARGE' ? 1 : 0,
        error: device.deviceState === 'ERROR' ? 1 : 0,
        offline: device.deviceState === 'OFFLINE' || device.deviceState === 'POWEROFF' ? 1 : 0
      }

      const isAllZero = Object.values(state).every((v) => v === 0)
      if (isAllZero) {
        return
      }

      if (!siteMap.has(siteId)) {
        siteMap.set(siteId, {
          id: site.siteId,
          name: site.siteName,
          lat: site.siteLatitude,
          lng: site.siteLongitude,
          country: site.siteAddressCountry,
          count: 0,
          operation: 0,
          wait: 0,
          charge: 0,
          error: 0,
          offline: 0
        })
      }

      const data = siteMap.get(siteId)
      data.count += 1
      data.operation += state.operation
      data.wait += state.wait
      data.charge += state.charge
      data.error += state.error
      data.offline += state.offline
    })

    const markers = Array.from(siteMap.values()).map((m) => ({
      id: m.id,
      name: m.name,
      lat: m.lat,
      lng: m.lng,
      country: m.country,
      stats: {
        operationCnt: m.operation,
        standbyCnt: m.wait,
        chargeCnt: m.charge,
        errorCnt: m.error,
        offlineCnt: m.offline,
        totalCnt: m.count
      }
    }))
    setMarkers(markers)
  }

  const loadRobotInfo = useCallback(async () => {
    try {
      const dataRobot = (await deviceApis.getDevices({ includeTaskFlowState: false })).content
      setDevices(dataRobot)
      const dataSite = (await siteApis.getSites({})).content
      setSites(dataSite)
    } catch (err) {
      console.error('Error loadGetGroupsSites:', err)
    } finally {
      setDevicesLoaded(true)
    }
  }, [])

  useEffect(() => {
    loadRobotInfo()
  }, [])

  // 지도에 표시되는 마커(=실제 로봇이 있는 사이트) 중 국내(KR) 사이트가 하나도 없으면
  // 처음 지도를 보여줄 때 해외 지도를 먼저 표시. 사용자가 토글을 직접 조작한 뒤에는
  // 다시 덮어쓰지 않도록 최초 1회만 적용.
  const mapRegionAutoSetRef = useRef(false)
  useEffect(() => {
    if (mapRegionAutoSetRef.current || markers.length === 0) return
    mapRegionAutoSetRef.current = true
    if (!markers.some((m) => m.country === 'KR')) {
      setMapRegion('GLOBAL')
    }
  }, [markers])

  const handleSelectOrg = useCallback((info) => {
    setOrgFilter(info)
  }, [])

  function matchOrgGroup(_device) {
    // return orgFilter.values[0] === 'all'
    //   ? true
    //   : orgFilter.values[0] === 'none'
    //     ? _device.provision?.isDefaultSite
    //     : !_device.provision.isDefaultSite && _device.provision?.groupId === orgFilter.values[0]
    return orgFilter.values[0] === 'all' ? true : _device.provision?.groupId === orgFilter.values[0]
  }

  function matchOrgSite(_device) {
    return orgFilter.values[1] === 'all'
      ? true
      : isDefaultSiteSelected
        ? _device.provision?.isDefaultSite
        : !_device.provision.isDefaultSite && _device.provision?.siteId === orgFilter.values[1]
  }

  useEffect(() => {
    let _deviceCount = { opr: 0, lrn: 0, sta: 0, chr: 0, err: 0, off: 0 }
    const _robotDatas = []

    for (let i = 0; i < devices.length; i++) {
      if (matchOrgGroup(devices[i]) && matchOrgSite(devices[i])) {
        switch (devices[i].deviceState ?? '') {
          case 'STANDBY':
            _deviceCount.sta++
            break
          case 'CHARGE':
            _deviceCount.chr++
            break
          case 'OPERATION':
            _deviceCount.opr++
            break
          case 'LEARNING':
            _deviceCount.lrn++
            break
          case 'OFFLINE':
          case 'POWEROFF':
            _deviceCount.off++
            break
          case 'ERROR':
            _deviceCount.err++
            break
        }
        _robotDatas.push(parseRobotData(devices[i]))
      }
    }
    setDeviceCount(_deviceCount)

    setRobotDatas(_robotDatas)

    if (orgFilter.values[1] !== 'all' && !isDefaultSiteSelected) {
      //setRobotDatas(_robotDatas)
    } else {
      //setRobotDatas([])
      setIsLiveImageMap(false)
      setUseImageMap(false)
      setMapData({})
      setMapServer({})
    }
  }, [orgFilter, devices, isDefaultSiteSelected])

  const resolveGroupId = useCallback(() => {
    let groupId = orgFilter.values[0]
    if (groupId === 'all') {
      const matched = orgFilter.actualOrgs?.find((org) => String(org.code) === String(orgFilter.values[1]))
      groupId = matched?.parentCode ?? groupId
    }
    return groupId
  }, [orgFilter])

  // 사이트 선택 시 건물/층/영역 계층 조회 (단건 조회가 buildings→floors→areas를 모두 포함)
  useEffect(() => {
    const siteId = orgFilter.values[1]
    let cancelled = false

    // 사이트가 바뀌는 즉시 이전 사이트의 buildings/locSel을 비워서
    // 다음 렌더에서 자동 선택 effect가 옛 데이터로 계산하지 않도록 함
    setBuildings([])
    setLocSel({ buildingId: '', floorId: '', areaId: '' })
    buildingsSiteIdRef.current = null

    if (siteId && siteId !== 'all' && !isDefaultSiteSelected) {
      siteApis
        .getSiteById(siteId)
        .then((data) => {
          // 그 사이 사이트가 바뀌었으면 이 응답은 무시
          if (cancelled) return
          buildingsSiteIdRef.current = siteId
          setBuildings(data?.buildings ?? [])
        })
        .catch((err) => {
          if (cancelled) return
          console.error('Error getSiteById:', err)
          setBuildings([])
          setLocSel({ buildingId: '', floorId: '', areaId: '' })
        })
    }

    return () => {
      cancelled = true
    }
  }, [orgFilter.values[1], isDefaultSiteSelected])

  // 영역별 로봇 수 (state.sitePosition.areaId 기준)
  const areaCounts = useMemo(() => {
    const m = {}
    devices.forEach((d) => {
      if (d.provision?.siteId !== orgFilter.values[1]) return
      const aid = d.state?.sitePosition?.areaId
      if (aid) m[aid] = (m[aid] ?? 0) + 1
    })
    return m
  }, [devices, orgFilter.values[1]])

  const areaRobotDatas = useMemo(() => {
    if (!locSel.areaId) return robotDatas
    return robotDatas.filter((r) => r.areaId === locSel.areaId)
  }, [robotDatas, locSel.areaId])

  // Kakao 지도는 국내(KR) 좌표 기준이므로 해외 사이트는 빼고 표시.
  // Google 지도로 전환하면 국내/해외를 모두 함께 보여줌(markers 원본 그대로 사용).
  const domesticMarkers = useMemo(() => markers.filter((m) => m.country === 'KR'), [markers])

  // 최초 로딩 시 로봇이 가장 많은 영역을 자동 선택 (지도 초기 표시).
  // devicesLoaded 대기: 대시보드 재진입처럼 buildings·devices 로딩이 동시에 시작되는 경우,
  // buildings가 먼저 응답하면 areaCounts가 아직 비어있어 우선순위 없이 첫 영역이 선택되는 문제 방지.
  useEffect(() => {
    if (!buildings.length || !devicesLoaded) return
    // buildings가 아직 현재 선택된 사이트에 대한 응답이 아니면 스킵
    if (buildingsSiteIdRef.current !== orgFilter.values[1]) return
    const best = pickMaxRobotArea(buildings, areaCounts)
    if (best) setLocSel(best)
  }, [buildings, devicesLoaded, areaCounts, orgFilter.values[1]])

  // 맵은 device/area 단위로만 존재 (site/building/floor 단독 조회 불가).
  // area로 조회할 때는 상위 buildingId/floorId를 반드시 함께 전달해야 함.
  useEffect(() => {
    if (
      orgFilter.values[1] !== 'all' &&
      !isDefaultSiteSelected &&
      buildingsSiteIdRef.current === orgFilter.values[1] &&
      locSel.buildingId &&
      locSel.floorId &&
      locSel.areaId
    ) {
      loadSiteMap(resolveGroupId(), orgFilter.values[1], {
        buildingId: locSel.buildingId,
        floorId: locSel.floorId,
        areaId: locSel.areaId
      })
    } else {
      setUseImageMap(false)
    }
  }, [orgFilter.values[1], isDefaultSiteSelected, locSel.buildingId, locSel.floorId, locSel.areaId])

  useEffect(() => {
    if (orgFilter.values[1] === 'all' || isDefaultSiteSelected) {
      makeMarker()
    }
  }, [devices, sites, orgFilter, isDefaultSiteSelected])

  function clickDeviceState(state) {
    setDeviceState(state)
    navigate('/robot/management')
  }

  const handleSiteMapPlay = (isPlay) => {
    setIsLiveImageMap(isPlay)
  }

  const loadSiteMap = useCallback(async (groupId, siteId, extra = {}) => {
    // 맵은 area 단위로만 존재하며, 조회 시 상위 buildingId/floorId를 반드시 함께 전달해야 함.
    if (!extra.areaId || !extra.buildingId || !extra.floorId) {
      setUseImageMap(false)
      return
    }
    try {
      const params = {
        groupId,
        siteId,
        buildingId: extra.buildingId,
        floorId: extra.floorId,
        areaId: extra.areaId
      }
      const data = await mapApis.getMapViewFind(params)

      let type = 'png'
      let url = ''
      if (data.mapServer?.navi?.svgDownloadUrl) {
        type = 'svg'
        url = data.mapServer.navi.svgDownloadUrl
      } else {
        url = data.mapServer?.navi?.pngDownloadUrl
      }

      if (!url) {
        setUseImageMap(false)
        return
      }

      setMapData({ type, url })
      setMapServer(data.mapServer)
      setUseImageMap(true)
    } catch (err) {
      console.error('Error loadSiteMap:', err)
      setUseImageMap(false)
    }
  }, [])

  const pollDevices = useCallback(async () => {
    try {
      const siteId = orgFilter.values[1] !== 'all' ? orgFilter.values[1] : undefined
      const newDevices = (
        await deviceApis.getDevices(siteId ? { siteId, includeTaskFlowState: false } : { includeTaskFlowState: false })
      ).content
      const { hasChange, merger } = buildDeviceMerger(newDevices, deviceTsRef.current)
      if (hasChange) setDevices(merger)
    } catch (err) {
      console.error('Error pollDevices:', err)
    }
  }, [orgFilter.values[1]])

  // Control real-time polling based on live mode and page visibility/window focus
  useEffect(() => {
    if (!isLiveImageMap) {
      if (liveIntervalRef.current) {
        clearInterval(liveIntervalRef.current)
        liveIntervalRef.current = null
      }
      return
    }

    const startPolling = () => {
      if (document.visibilityState === 'visible' && document.hasFocus() && !liveIntervalRef.current) {
        liveIntervalRef.current = setInterval(pollDevices, 1000)
      }
    }

    const stopPolling = () => {
      if (liveIntervalRef.current) {
        clearInterval(liveIntervalRef.current)
        liveIntervalRef.current = null
      }
    }

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && document.hasFocus()) {
        startPolling()
      } else {
        stopPolling()
      }
    }

    const handleBlur = () => stopPolling()
    const handleFocus = () => startPolling()

    startPolling()
    document.addEventListener('visibilitychange', handleVisibilityChange)
    window.addEventListener('blur', handleBlur)
    window.addEventListener('focus', handleFocus)
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      window.removeEventListener('blur', handleBlur)
      window.removeEventListener('focus', handleFocus)
      stopPolling()
    }
  }, [isLiveImageMap, pollDevices])

  // 사이트가 선택되면(전체/없음 제외) 사이트 지도 영역을 노출 (시험용)
  const hasSite = orgFilter.values[1] !== 'all' && !isDefaultSiteSelected

  return (
    <>
      <DashboardWrapper>
        <Title>{t('dashboard')}</Title>
        <DashboardControlsContainer>
          <OrganizationSelector
            onChange={handleSelectOrg}
            // supportAlls={[true, true]}
            supportNone={[false, false]}
          />
          <DashboardButtonGroup>
            {useImageMap &&
              (!isLiveImageMap ? (
                <PlayButton onClick={() => handleSiteMapPlay(true)}>
                  <Play className="w-[14px] h-[14px]" /> {t('realtime')}
                </PlayButton>
              ) : (
                <StopButton onClick={() => handleSiteMapPlay(false)}>
                  <Stop className="w-[14px] h-[14px]" /> {t('stop')}
                </StopButton>
              ))}
            {import.meta.env.VITE_FEATURE_LEARNING_ENABLED === 'true' && (
              <PlayButton
                onClick={() => {
                  let groupId = orgFilter.values[0]
                  if (groupId === 'all' && orgFilter.values[1] !== 'all') {
                    const matched = orgFilter.actualOrgs?.find((org) => String(org.code) === String(orgFilter.values[1]))
                    groupId = matched?.parentCode ?? groupId
                  }

                  const params = new URLSearchParams({
                    group: groupId,
                    site: orgFilter.values[1] ?? 'all'
                  })
                  window.open(`/robot/tv?${params}`, '_blank')
                }}
              >
                ⬛ {t('tvView')}
              </PlayButton>
            )}
          </DashboardButtonGroup>
        </DashboardControlsContainer>

        <DivPageBody>
          <DivDashState>
            <DashSection>
              <DivSectionTitle>
                <H3SectionTitle>{t('robotStateStatus', '로봇 상태 현황')}</H3SectionTitle>
                <span
                  style={{
                    marginLeft: 'auto',
                    marginBottom: '1.3rem',
                    fontSize: '1.4rem',
                    fontWeight: 600,
                    color: '#64748b'
                  }}
                >
                  {t('totalRobots')}{' '}
                  <strong style={{ color: '#7D776A', fontWeight: 800 }}>
                    {deviceCount.opr +
                      deviceCount.lrn +
                      deviceCount.sta +
                      deviceCount.chr +
                      deviceCount.err +
                      deviceCount.off}
                  </strong>
                  {t('unit')}
                </span>
              </DivSectionTitle>
              <RobotStateCards deviceCount={deviceCount} onClickState={clickDeviceState} row />
            </DashSection>
            <DivMarginTop />
            <DashSection>
              <DivSectionTitleWrap>
                <H3SectionTitle>{t('robotPlacementStatus', '로봇 배치 현황 및 위치 정보')}</H3SectionTitle>
                {hasSite && (
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      marginBottom: '1.3rem',
                      marginLeft: '1rem',
                      position: 'relative',
                      zIndex: 20000 // 아래 지도(SiteMap3D 로봇 마커 툴팁 zIndex:10000)보다 위에 옵션 목록이 뜨도록
                    }}
                  >
                    <LocationSelector
                      buildings={buildings}
                      value={locSel}
                      onChange={setLocSel}
                      areaCounts={areaCounts}
                    />
                  </div>
                )}
                {isLiveImageMap && <LiveSpan>Live</LiveSpan>}
                {!hasSite && (
                  <MapRegionToggle>
                    <MapRegionToggleBtn
                      type="button"
                      $on={mapRegion !== 'GLOBAL'}
                      $pos="left"
                      onClick={() => setMapRegion('DOMESTIC')}
                    >
                      {t('regionDomestic')}
                    </MapRegionToggleBtn>
                    <MapRegionToggleBtn
                      type="button"
                      $on={mapRegion === 'GLOBAL'}
                      $pos="right"
                      onClick={() => setMapRegion('GLOBAL')}
                    >
                      {t('regionGlobal')}
                    </MapRegionToggleBtn>
                  </MapRegionToggle>
                )}
              </DivSectionTitleWrap>
              {/* 지도 영역: 사이트 미선택 → 권역 지도, 사이트 선택 → 맵 있으면 SiteMap3D,
                  없으면 "표시할 지도가 없습니다" 안내. (사이트 선택 시점부터 영역 항시 표시) */}
              <SectionMap>
                <DivMapCard>
                  {!hasSite ? (
                    mapRegion === 'GLOBAL' ? (
                      <LocationGoogle markers={markers} />
                    ) : (
                      <Location markers={domesticMarkers} />
                    )
                  ) : useImageMap ? (
                    <SiteMap3D
                      mapData={mapData}
                      mapServer={mapServer}
                      robotDatas={areaRobotDatas}
                      clickRobot={true}
                      viewModeKey={DASHBOARD_MAP_VIEW_KEY}
                    />
                  ) : (
                    <div
                      style={{
                        display: 'flex',
                        width: '100%',
                        alignItems: 'center',
                        justifyContent: 'center',
                        minHeight: '360px'
                      }}
                    >
                      <NoData>{t('noMapToShow')}</NoData>
                    </div>
                  )}
                </DivMapCard>
              </SectionMap>
            </DashSection>
          </DivDashState>
        </DivPageBody>

        {/* 점검 알림 (하단, collapsible) */}
        <InspectionWrapper>
          <CollapsibleSectionHeader $collapsed={inspectionCollapsed} onClick={() => setInspectionCollapsed((v) => !v)}>
            <H3SectionTitle style={{ margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
              <CollapsibleChevron $collapsed={inspectionCollapsed} />
              {t('inspectionNotification')}
            </H3SectionTitle>
          </CollapsibleSectionHeader>
          <CollapsibleBody $collapsed={inspectionCollapsed}>
            <SectionRobot>
              <DivDashAlarmTable>
                <TableAlarm robotDatas={robotDatas} />
              </DivDashAlarmTable>
            </SectionRobot>
          </CollapsibleBody>
        </InspectionWrapper>

        <DivMarginTop />

        {/* 데이터 수집 현황 (collapsible, 기본 접힘) — TV Gradient GUI 색상과 동일하게 표시 */}
        {import.meta.env.VITE_FEATURE_LEARNING_ENABLED === 'true' && (
          <DataCollectionSection
            collapsible
            line="#b91c4c"
            areaColor="#9aa0a8"
            targetColor="#c5c6c9"
            monFill="url(#monGray)"
            qEmphFill="url(#qCrimson)"
            qBaseFill="#cbc8c2"
            segFill="linear-gradient(335deg, #cd7b94 11.32%, #bf2d59 44.35%, #b91c4c 77.37%)"
            segEmpty="#cbc8c2"
          />
        )}
      </DashboardWrapper>
    </>
  )
}

export default Dashboard
