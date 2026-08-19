import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'react-toastify'
import { Button, LocationBar, Section, SemanticPage, Title } from '@repo/ui'
import MapCanvas from '@/components/MapCanvas'
import { useFoxglove } from '@/hooks/useFoxglove'
import { NAV_STATUS_TOPICS, SPIN_STATUS_TOPICS, STATUS_TOPICS } from '@/constants/topics'
import { syncLevelSelection } from '@/utils/location'
import { useLocationStore } from '@/stores/useLocationStore'
import {
  isNavMoving,
  isSpinning,
  parseNavStatus,
  parseSpinStatus,
  summarizeNavStatus,
  summarizeSpinStatus
} from '@/utils/navStatus'
import { resolveWsUrl } from '@/utils/wsUrl'
import {
  StyledSemanticPageContent,
  BadgeRow,
  LocationRow,
  EmptyMessage,
  MapClickArea,
  MappingStatusBadge,
  NavBubble
} from './styles'

import * as poiApi from '@/apis/mapPoiApis'
import * as mapApi from '@/apis/mapApis'
import { navGoto, navSpin, stopNavGoto, stopNavSpin } from '@/apis/navApis'
import { list as listBuildings } from '@/apis/buildingApis'
import { list as listFloors } from '@/apis/floorApis'
import { list as listAreas } from '@/apis/areaApis'

/** 맵 산출물 파일 확장자 — 레코드 값이 파일 경로인지 판단하는 기준. */
const MAP_FILE_EXT = /\.(png|pgm|yaml|yml|pcd|txt|bin)$/i

/**
 * save_map 이 맵 디렉터리 안에 만드는 산출물 파일 이름(확장자 제외).
 * 이 이름들이면 파일이 곧 디렉터리 소속이므로 상위 폴더가 맵 디렉터리다.
 */
const MAP_ARTIFACT_NAMES = new Set(['grid_map', 'global_map', 'map', 'optimized_trajectory', 'frontend_trajectory'])

/**
 * 맵 레코드에서 맵 디렉터리(lio_switch_mode 의 map_path)를 얻는다.
 *
 * save_map 은 맵 하나를 디렉터리 단위로 저장하고(global_map.pcd + optimized_trajectory.txt +
 * grid_map.*), loadMap 은 그 디렉터리에 '/global_map.pcd' 를 붙여 찾는다
 * (gtsam_backend.cpp). 반면 레코드의 imagePath 는 BE 가 검증하지 않아 형태가 세 가지로 들어온다:
 *
 *   1) /ws/maps/<맵이름>                    (디렉터리)          → 그대로
 *   2) /ws/maps/<맵이름>/grid_map.png       (디렉터리 안 산출물) → 상위 폴더
 *   3) /ws/maps/<맵이름>.pgm                (맵 이름이 곧 파일명) → 확장자만 제거
 *
 * 3) 을 2) 처럼 다루면 /ws/maps 까지만 남아 맵 로드가 실패한다 — 마지막 세그먼트가
 * 산출물 이름(grid_map 등)인지로 2) 와 3) 을 가른다.
 */
const resolveMapDir = (record) => {
  const raw = record?.imagePath || record?.yamlPath
  if (!raw) return ''
  // 후행 슬래시는 제거한다 — loadMap 은 '/'를 붙여 이어붙이므로 있으나 없으나 동작하지만
  // 마지막 세그먼트 판정이 빈 문자열이 되는 것을 막는다.
  const normalized = String(raw).replace(/\\/g, '/').replace(/\/+$/, '')
  if (!normalized) return ''

  const idx = normalized.lastIndexOf('/')
  const lastSegment = idx >= 0 ? normalized.slice(idx + 1) : normalized

  // 1) 확장자가 없으면 디렉터리로 본다.
  if (!MAP_FILE_EXT.test(lastSegment)) return normalized

  const baseName = lastSegment.replace(MAP_FILE_EXT, '')
  // 2) 디렉터리 안의 산출물 파일 → 상위 폴더가 맵 디렉터리.
  if (MAP_ARTIFACT_NAMES.has(baseName.toLowerCase())) return idx > 0 ? normalized.slice(0, idx) : ''
  // 3) 파일명이 곧 맵 이름 → 확장자만 떼면 맵 디렉터리.
  return idx > 0 ? `${normalized.slice(0, idx)}/${baseName}` : baseName
}

/**
 * Semantic
 *
 * 선택한 위치(Building > Floor > Area)의 맵에 달린 POI 를 편집하는 페이지.
 * 레이아웃은 Map(스캔) 페이지와 같은 구성이다
 * (StyledPageContent > Title / LocationBar / Section):
 * ┌────────────────────────────────────────────┐
 * │ Title (페이지 제목)                          │
 * │ LocationBar (위치 선택)                      │
 * │ ┌─ Section ────────────────────────────────┐│
 * │ │ 저장 / 취소                                ││
 * │ └──────────────────────────────────────────┘│
 * │ ┌─ Section ──────────┐ ┌─ Section ────────┐│
 * │ │ MapCanvas (지도)     │ │ POI 목록 / 상세   ││
 * │ └────────────────────┘ └──────────────────┘│
 * └────────────────────────────────────────────┘
 * (아래 두 줄은 공용 SemanticPage 가 내보내고, 지도 칸만 mapSlot 으로 넘긴다)
 *
 * POI 는 맵(mapId)에 매달리므로 편집 대상 맵이 정해져야 한다 — 선택한 Area 의 맵을
 * /maps?areaId= 로 찾아 그 맵의 POI 만 조회/저장한다.
 */
const Semantic = () => {
  const { t } = useTranslation('map')
  const [state, setState] = useState('STATE_IDLE')
  const [pois, setPois] = useState([])

  // 위치 선택은 스토어 공유 — 맵 스캔에서 고른 값을 그대로 이어받고 새로고침에도 유지된다.
  // zustand v5 는 객체 셀렉터가 매 렌더 새 참조를 내므로 필드 단위로 구독한다.
  const buildingId = useLocationStore((state) => state.buildingId)
  const floorId = useLocationStore((state) => state.floorId)
  const areaId = useLocationStore((state) => state.areaId)
  const setLocation = useLocationStore((state) => state.setLocation)
  const pruneMissing = useLocationStore((state) => state.pruneMissing)
  const setLevelIfEmpty = useLocationStore((state) => state.setLevelIfEmpty)
  const location = useMemo(() => ({ buildingId, floorId, areaId }), [buildingId, floorId, areaId])
  const levelActions = useMemo(() => ({ pruneMissing, setLevelIfEmpty }), [pruneMissing, setLevelIfEmpty])

  const [buildings, setBuildings] = useState([])
  const [floors, setFloors] = useState([])
  const [areas, setAreas] = useState([])
  // 선택한 구역의 맵 레코드. POI 소속(mapId)뿐 아니라 측위 전환에 쓸 맵 경로도 여기서 나온다.
  const [mapRecord, setMapRecord] = useState(null)
  const mapId = mapRecord?.id ?? null
  const mapDir = useMemo(() => resolveMapDir(mapRecord), [mapRecord])

  // 지도 클릭으로 잡은 이동 목표 — { x, y, canvasX, canvasY }. 있으면 말풍선이 뜬다.
  const [navTarget, setNavTarget] = useState(null)
  const [isLoadingMap, setIsLoadingMap] = useState(false)
  const [isSendingGoto, setIsSendingGoto] = useState(false)
  const [isSendingSpin, setIsSendingSpin] = useState(false)

  // 왼쪽 지도 칸은 Map(스캔) 페이지와 같은 foxglove 캔버스를 쓴다.
  // 이 화면에는 연결 툴바가 없으므로 진입 시 바로 연결하고 떠날 때 끊는다
  // (구독은 advertise 를 받은 useFoxglove 가 역할별로 자동 처리한다).
  const [wsUrl] = useState(resolveWsUrl)
  const {
    mapData,
    odomData,
    scanData,
    robotPose,
    frameCorrections,
    subscribedTopics,
    customTopicsData,
    connect,
    disconnect
  } = useFoxglove(wsUrl, 10)

  // 맵 로드(측위) 진행 상태와 주행 상태 — 둘 다 폴링이 아니라 토픽 구독으로 들어온다.
  const lioStatusTopic = STATUS_TOPICS.find((topic) => subscribedTopics.includes(topic)) ?? null
  const lioStatus = lioStatusTopic ? customTopicsData[lioStatusTopic]?.data : null
  const navStatusTopic = NAV_STATUS_TOPICS.find((topic) => subscribedTopics.includes(topic)) ?? null
  const navStatus = useMemo(
    () => parseNavStatus(navStatusTopic ? customTopicsData[navStatusTopic]?.data : null),
    [navStatusTopic, customTopicsData]
  )
  const spinStatusTopic = SPIN_STATUS_TOPICS.find((topic) => subscribedTopics.includes(topic)) ?? null
  const spinStatus = useMemo(
    () => parseSpinStatus(spinStatusTopic ? customTopicsData[spinStatusTopic]?.data : null),
    [spinStatusTopic, customTopicsData]
  )

  const isMoving = isNavMoving(navStatus)
  const isRotating = isSpinning(spinStatus)
  const gotoState = navStatus?.goto?.state ?? null
  // GKR 재정위는 로봇이 제자리에서 한 바퀴 돌아야 진행된다 — 그 단계에서만 회전 버튼을 노출한다.
  const needsGkrSpin = lioStatus === 'relocalizing_gkr'
  // 측위 완료 = 맵이 로드되고 재정위까지 끝난 상태. 이때만 지도/이동이 의미가 있다.
  const isLocalized = lioStatus === 'ready'

  useEffect(() => {
    connect()
    return () => disconnect()
  }, [connect, disconnect])

  // 이동 종료 알림 — 응답으로는 알 수 없으므로(goal 만 걸고 반환) 상태 토픽의 전이를 보고 알린다.
  // 같은 state 가 하트비트로 반복 발행되므로 직전 값과 다를 때만 토스트를 띄운다.
  const prevGotoStateRef = useRef(null)
  useEffect(() => {
    const prev = prevGotoStateRef.current
    prevGotoStateRef.current = gotoState
    if (!gotoState || prev === null || prev === gotoState) return
    if (gotoState === 'DONE') toast.success(t('navArrived'), { autoClose: 2000 })
    if (gotoState === 'FAILED') toast.error(navStatus?.goto?.message || t('navFailed'), { autoClose: 3000 })
    // navStatus 는 매 틱 새 객체지만 위 가드로 state 가 바뀔 때만 동작한다.
  }, [gotoState, navStatus, t])

  // 위치 계층 목록 조회. 상위 선택이 바뀌면 하위 목록을 다시 받아온다
  // (하위 선택 초기화는 LocationBar 의 onChange 가 넘겨주는 값으로 처리된다).
  //
  // 맵 스캔 화면과 동일한 규칙(utils/location.js syncLevelSelection): 스토어에 남은 선택을 목록과
  // 맞춘 뒤 비어 있으면 첫 항목으로 채운다 — POI 는 맵(mapId)에 매달리고 그 맵은 선택한 Area 로
  // 찾으므로, 진입 직후 편집 대상이 정해져 있어야 한다.
  useEffect(() => {
    let alive = true
    listBuildings()
      .then((res) => {
        if (!alive) return
        const items = res?.data || []
        setBuildings(items)
        syncLevelSelection(levelActions, 'buildingId', items)
      })
      .catch(() => alive && setBuildings([]))
    return () => {
      alive = false
    }
  }, [levelActions])

  useEffect(() => {
    if (!buildingId) {
      setFloors([])
      return
    }
    let alive = true
    listFloors({ buildingId })
      .then((res) => {
        if (!alive) return
        const items = res?.data || []
        setFloors(items)
        syncLevelSelection(levelActions, 'floorId', items)
      })
      .catch(() => alive && setFloors([]))
    return () => {
      alive = false
    }
  }, [buildingId, levelActions])

  useEffect(() => {
    if (!floorId) {
      setAreas([])
      return
    }
    let alive = true
    listAreas({ floorId })
      .then((res) => {
        if (!alive) return
        const items = res?.data || []
        setAreas(items)
        syncLevelSelection(levelActions, 'areaId', items)
      })
      .catch(() => alive && setAreas([]))
    return () => {
      alive = false
    }
  }, [floorId, levelActions])

  // 선택한 구역의 맵(POI 소속). 구역 하나에 맵이 여러 개면 최신 것을 쓴다(BE 가 createdAt DESC 로 내려준다).
  useEffect(() => {
    if (!areaId) {
      setMapRecord(null)
      return
    }
    let alive = true
    mapApi
      .list({ areaId })
      .then((res) => alive && setMapRecord(res?.data?.[0] ?? null))
      .catch(() => alive && setMapRecord(null))
    return () => {
      alive = false
    }
  }, [areaId])

  // 편집 대상 맵이 바뀌면 이전 위치를 가리키던 말풍선은 의미가 없다.
  useEffect(() => {
    setNavTarget(null)
  }, [mapId])

  /**
   * 선택한 위치의 맵을 로봇에 로드한다(측위 모드 전환).
   * 응답은 3D 맵 로드까지만 보장하므로 이후 진행은 /lio_node/status 배지로 확인한다.
   */
  const handleLoadMap = async () => {
    if (!mapDir) {
      toast.error(t('noMapForArea'), { autoClose: 3000 })
      return
    }
    setIsLoadingMap(true)
    try {
      const response = await mapApi.loadMapForLocalization({ mapPath: mapDir })
      toast.success(response?.data?.message || t('mapLoadRequested'), { autoClose: 2000 })
    } catch (error) {
      const message = error?.response?.data?.error?.message || error?.message || 'Request failed'
      toast.error(message, { autoClose: 3000 })
    } finally {
      setIsLoadingMap(false)
    }
  }

  // 지도 클릭 → 그 지점의 월드 좌표를 말풍선으로 띄운다(아직 이동하지 않는다).
  const handleMapClick = useCallback(({ x, y, canvasX, canvasY }) => {
    setNavTarget({ x, y, canvasX, canvasY })
  }, [])

  // 줌/팬이 일어나면 말풍선 위치(캔버스 픽셀 기준)가 클릭 지점과 어긋나므로 닫는다.
  const handleViewChange = useCallback(() => {
    setNavTarget(null)
  }, [])

  /** 말풍선의 이동 버튼 — nav_goto. 도착 여부는 주행 상태 배지로 확인한다. */
  const handleGoto = async () => {
    if (!navTarget) return
    setIsSendingGoto(true)
    try {
      const response = await navGoto({ x: navTarget.x, y: navTarget.y })
      toast.success(response?.data?.message || t('navGotoRequested'), { autoClose: 2000 })
      setNavTarget(null)
    } catch (error) {
      const message = error?.response?.data?.error?.message || error?.message || 'Request failed'
      toast.error(message, { autoClose: 3000 })
    } finally {
      setIsSendingGoto(false)
    }
  }

  /**
   * GKR 재정위용 제자리 회전 — nav_spin_once(기본 360°).
   * 실행은 motor-2wheel 이 /cmd_vel 로 처리하므로 측위 전에도 동작한다.
   * 진행은 /robot_hub/nav_spin_status 배지로 확인한다.
   */
  const handleSpin = async () => {
    setIsSendingSpin(true)
    try {
      const response = await navSpin({ degrees: 360 })
      toast.success(response?.data?.message || t('navSpinRequested'), { autoClose: 2000 })
    } catch (error) {
      const message = error?.response?.data?.error?.message || error?.message || 'Request failed'
      toast.error(message, { autoClose: 3000 })
    } finally {
      setIsSendingSpin(false)
    }
  }

  /** 진행 중인 제자리 회전 정지 — nav_spin_stop. */
  const handleStopSpin = async () => {
    setIsSendingSpin(true)
    try {
      const response = await stopNavSpin()
      toast.success(response?.data?.message || t('navSpinStopRequested'), { autoClose: 2000 })
    } catch (error) {
      const message = error?.response?.data?.error?.message || error?.message || 'Request failed'
      toast.error(message, { autoClose: 3000 })
    } finally {
      setIsSendingSpin(false)
    }
  }

  /** 진행 중인 이동 취소 — nav_goto_stop. 주행 중일 때만 노출한다. */
  const handleStopGoto = async () => {
    setIsSendingGoto(true)
    try {
      const response = await stopNavGoto()
      toast.success(response?.data?.message || t('navStopRequested'), { autoClose: 2000 })
    } catch (error) {
      const message = error?.response?.data?.error?.message || error?.message || 'Request failed'
      toast.error(message, { autoClose: 3000 })
    } finally {
      setIsSendingGoto(false)
    }
  }

  // 위치를 고르면 그 맵의 POI 만, 아직 안 골랐으면 전체 POI 를 보여준다
  // (위치 계층을 쓰지 않는 로봇도 POI 는 편집해야 한다).
  const fetchData = useCallback(async () => {
    setState('STATE_LOADING')
    try {
      const res = await poiApi.list(mapId ? { mapId } : undefined)
      res.data.map((poi) => {
        poi.pose = {}
        poi.pose.position = {
          x: poi.posX,
          y: poi.posY,
          z: poi.posZ
        }
        delete poi.posX
        delete poi.posY
        delete poi.posZ
        poi.pose.orientation = {
          x: poi.oriX,
          y: poi.oriY,
          z: poi.oriZ,
          w: poi.oriW
        }
        delete poi.oriX
        delete poi.oriY
        delete poi.oriZ
        delete poi.oriW
      })
      setPois(res.data ?? [])
      setState('STATE_EDITING')
    } catch (error) {
      console.error('[SemanticPage] POI 조회 실패:', error)
      setState('STATE_IDLE')
    }
  }, [mapId])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const onSave = async (pois) => {
    const toCreatPois = pois.filter((e) => e._work.created && !e._work.softDelete).map(({ _work, ...rest }) => rest)
    const toUpadtePois = pois
      .filter((e) => e._work.saved && e._work.edited && !e._work.softDelete)
      .map(({ _work, ...rest }) => rest)
    const toDeletePois = pois.filter((e) => e._work.saved && e._work.softDelete).map(({ _work, ...rest }) => rest)

    // 새 POI 는 소속 맵(mapId)이 있어야 저장된다(BE 가 없으면 400). 수정/삭제는 mapId 없이도 된다.
    if (toCreatPois.length > 0 && !mapId) {
      toast.error(t('selectLocationForSemantic'), { autoClose: 3000 })
      return
    }
    if (toCreatPois.length > 0) {
      await poiApi.bulkCreate({ mapId, pois: toCreatPois })
    }
    for (const poi of toUpadtePois) {
      await poiApi.update(poi.id, poi)
    }
    for (const poi of toDeletePois) {
      await poiApi.remove(poi.id)
    }
    fetchData()
  }

  const onCancel = () => {
    fetchData()
  }

  return (
    <StyledSemanticPageContent className="column">
      <Title>{t('semanticPageTitle')}</Title>

      <LocationRow>
        {/* 위치 계층 선택 (Building > Floor > Area) */}
        <LocationBar buildings={buildings} floors={floors} areas={areas} value={location} onChange={setLocation} />

        <BadgeRow>
          {/* 선택한 위치의 맵을 로봇에 로드(측위 전환) — 이동 명령의 전제다.
              측위가 끝나(ready) 지도가 올라온 뒤에는 할 일이 없으므로 버튼을 감춘다.
              자동으로 걸지 않는다: 로봇을 실제로 재정위시키는 동작이라 사용자가 시점을 골라야 한다. */}
          {!isLocalized && (
            <Button
              size="md"
              onClick={handleLoadMap}
              disabled={!mapDir || isLoadingMap}
              title={mapDir || t('noMapForArea')}
            >
              {isLoadingMap ? t('waitingForData') : t('loadMap')}
            </Button>
          )}

          {/* GKR 재정위 단계에서만 회전 버튼을 노출한다 — 로봇이 한 바퀴 돌아야 측위가 진행된다.
              회전 중에는 같은 자리에서 정지 버튼으로 바뀐다(중복 요청은 로봇이 거부한다). */}
          {needsGkrSpin &&
            (isRotating ? (
              <Button size="md" theme="delete" onClick={handleStopSpin} disabled={isSendingSpin}>
                {t('navSpinStop')}
              </Button>
            ) : (
              <Button size="md" onClick={handleSpin} disabled={isSendingSpin} title={t('navSpinHint')}>
                {t('navSpin')}
              </Button>
            ))}

          {/* 회전 진행 상태 (/robot_hub/nav_spin_status) — 회전 중이거나 GKR 단계에서만 의미가 있다 */}
          {(needsGkrSpin || isRotating) && (
            <MappingStatusBadge $active={isRotating}>
              <span className="label typographyBody5">{t('navSpinStatus')}</span>
              <strong className="value typographyBody5">
                {summarizeSpinStatus(spinStatus) || t('waitingForData')}
              </strong>
            </MappingStatusBadge>
          )}

          {/* 주행 중에만 정지 버튼을 노출한다 — nav_goto 응답으로는 종료를 알 수 없어
              상태 토픽(goto_status.active)이 유일한 판단 근거다. */}
          {isMoving && (
            <Button size="md" theme="delete" onClick={handleStopGoto} disabled={isSendingGoto}>
              {t('navStop')}
            </Button>
          )}

          {/* 맵 로드/측위 진행 상태 (/lio_node/status) */}
          <MappingStatusBadge $active={lioStatus === 'ready'}>
            <span className="label typographyBody5">{t('status')}</span>
            <strong className="value typographyBody5">{lioStatus || t('waitingForData')}</strong>
          </MappingStatusBadge>

          {/* 주행 진행 상태 (/robot_hub/nav_action_status) */}
          <MappingStatusBadge $active={isMoving}>
            <span className="label typographyBody5">{t('navStatus')}</span>
            <strong className="value typographyBody5">{summarizeNavStatus(navStatus) || t('waitingForData')}</strong>
          </MappingStatusBadge>
        </BadgeRow>
      </LocationRow>

      {/* POI 편집 — SemanticPage 가 Section(명령 버튼) + Section(지도 | 목록/상세)을 직접 내보낸다 */}
      {state === 'STATE_EDITING' ? (
        <SemanticPage
          poiList={pois}
          onSave={onSave}
          onCancel={onCancel}
          mapSlot={
            <MapClickArea>
              <MapCanvas
                mapData={mapData}
                scanData={scanData}
                odomData={odomData}
                robotPose={robotPose}
                subscribedTopics={subscribedTopics}
                customTopicsData={customTopicsData}
                frameCorrections={frameCorrections}
                // POI 편집 화면이라 실시간 라이다 점군은 지도를 가리기만 한다
                showScan={false}
                onMapClick={handleMapClick}
                onViewChange={handleViewChange}
                t={t}
              />

              {/* 클릭 지점 말풍선 — 좌표 표시 + 이동 */}
              {navTarget && (
                <NavBubble $x={navTarget.canvasX} $y={navTarget.canvasY}>
                  <span className="coords typographyBody5">
                    {`X ${navTarget.x.toFixed(2)} m · Y ${navTarget.y.toFixed(2)} m`}
                  </span>
                  <div className="actions">
                    {/* 주행 중에는 새 목표를 겹쳐 보내지 않는다 — 상단 정지 버튼으로 먼저 멈춘다. */}
                    <Button
                      size="sm"
                      onClick={handleGoto}
                      disabled={isSendingGoto || isMoving}
                      title={isMoving ? t('navMovingHint') : undefined}
                    >
                      {t('moveHere')}
                    </Button>
                    <Button size="sm" theme="tertiary" onClick={() => setNavTarget(null)}>
                      {t('close')}
                    </Button>
                  </div>
                </NavBubble>
              )}
            </MapClickArea>
          }
        />
      ) : (
        <Section>
          <EmptyMessage className="typographyBody5">
            {state === 'STATE_LOADING' ? t('waitingForData') : t('noPoiLoaded')}
          </EmptyMessage>
        </Section>
      )}
    </StyledSemanticPageContent>
  )
}

export default Semantic
