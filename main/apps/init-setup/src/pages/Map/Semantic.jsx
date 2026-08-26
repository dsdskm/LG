import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'react-toastify'
import { Button, Dropdown, Section, SemanticPage, Title } from '@repo/ui'
import MapCanvas from '@/components/MapCanvas'
import { useTelemetry } from '@/hooks/useTelemetry'
import { NAV_STATUS_TOPICS, SPIN_STATUS_TOPICS, STATUS_TOPICS } from '@/constants/topics'
import { resolveMapDir, visibleMaps } from '@/utils/mapRecord'
import { resolveMappingMode } from '@/utils/lioStatus'
import { SETUP_STEPS, tryAdvanceSetupProgress } from '@/utils/setupProgress'
import {
  isNavMoving,
  isSpinning,
  parseNavStatus,
  parseSpinStatus,
  summarizeNavStatus,
  summarizeSpinStatus
} from '@/utils/navStatus'
import { resolveWsUrl } from '@/utils/wsUrl'
import { MAP_FRAME } from '@/utils/tf'
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

/** 맵 표시 이름 — 레코드의 다국어 이름, 없으면 저장 디렉터리 이름(= 맵 이름). */
const mapLabel = (map) => {
  const display = map?.name?.default ?? map?.name?.['ko-KR'] ?? map?.name?.['en-US'] ?? null
  return display || resolveMapDir(map).split('/').pop() || `#${map?.id}`
}

/**
 * 진입 시 선택/자동 로딩할 맵 하나를 고른다.
 *
 * inactive 를 먼저 본다 — 맵 저장 시점의 레코드가 inactive 이고(utils/mapRecord.buildMapRecordBody)
 * 업로드(승격) 후에야 active 가 되므로, inactive 가 있으면 그게 지금 POI 를 얹는 중인 작업본이다.
 * 없으면 서비스에 쓰이는 active 맵을 고른다. 목록은 createdAt DESC 라 같은 status 안에서는
 * 가장 최근 맵이다.
 */
const pickWorkingMap = (maps) =>
  maps.find((map) => map?.status === 'inactive') ?? maps.find((map) => map?.status === 'active') ?? maps[0] ?? null

/**
 * Semantic
 *
 * 저장된 맵 하나를 골라 그 맵에 달린 POI 를 편집하는 페이지.
 * 레이아웃은 Map(스캔) 페이지와 같은 구성이다
 * (StyledPageContent > Title / 맵 선택 줄 / Section):
 * ┌────────────────────────────────────────────┐
 * │ Title (페이지 제목)                          │
 * │ 맵 선택 + 로드/상태 배지                       │
 * │ ┌─ Section ────────────────────────────────┐│
 * │ │ 저장 / 취소                                ││
 * │ └──────────────────────────────────────────┘│
 * │ ┌─ Section ──────────┐ ┌─ Section ────────┐│
 * │ │ MapCanvas (지도)     │ │ POI 목록 / 상세   ││
 * │ └────────────────────┘ └──────────────────┘│
 * └────────────────────────────────────────────┘
 * (아래 두 줄은 공용 SemanticPage 가 내보내고, 지도 칸만 mapSlot 으로 넘긴다)
 *
 * POI 는 맵(mapId)에 매달리므로 편집 대상 맵이 정해져야 한다 — GET /maps 목록에서 맵을 직접 고르고
 * 그 맵의 POI 만 조회/저장한다. 위치 계층(Building/Floor/Area)으로 좁히지 않는다: 구역에 매이지 않은
 * 맵(위치 정보 없이 저장된 Default 등)도 편집 대상이어야 한다.
 */
const Semantic = () => {
  const { t } = useTranslation('map')
  const [state, setState] = useState('STATE_IDLE')
  const [pois, setPois] = useState([])
  const [poiVersion, setPoiVersion] = useState(null)

  // 편집 대상은 위치 계층이 아니라 저장된 맵 목록에서 직접 고른다 — POI 는 맵(mapId)에 매달리므로
  // 맵이 곧 선택 단위다. 위치 계층으로 좁히면 구역이 없는 맵(Default 등)은 고를 수 없다.
  const [maps, setMaps] = useState([])
  const [selectedMapId, setSelectedMapId] = useState('')
  const mapRecord = useMemo(
    () => maps.find((map) => String(map.id) === String(selectedMapId)) ?? null,
    [maps, selectedMapId]
  )
  const mapId = mapRecord?.id ?? null
  const mapDir = useMemo(() => resolveMapDir(mapRecord), [mapRecord])
  const mapOptions = useMemo(() => maps.map((map) => ({ value: String(map.id), name: mapLabel(map) })), [maps])

  // 지도 클릭으로 잡은 이동 목표 — { x, y, canvasX, canvasY }. 있으면 말풍선이 뜬다.
  const [navTarget, setNavTarget] = useState(null)
  const [isLoadingMap, setIsLoadingMap] = useState(false)
  // 측위가 끝난(ready) 뒤 다른 맵으로 갈아타는 중인지 — 이때만 위치 선택과 맵 로드 버튼을 다시 연다.
  const [isSwitchingMap, setIsSwitchingMap] = useState(false)
  // 맵 로드 요청으로 시작된 재정위인지 — 그때만 회전을 자동으로 건다.
  const autoSpinArmedRef = useRef(false)
  const [isSendingGoto, setIsSendingGoto] = useState(false)
  const [isSendingSpin, setIsSendingSpin] = useState(false)

  // 왼쪽 지도 칸은 Map(스캔) 페이지와 같은 캔버스를 쓴다.
  // 이 화면에는 연결 툴바가 없으므로 진입 시 바로 연결하고 떠날 때 끊는다
  // (구독은 advertise 를 받은 useTelemetry 가 역할별로 자동 처리한다).
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
  } = useTelemetry(wsUrl, 10)

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

  // POI 좌표로 쓸 로봇 현재 위치 — 지도(map) 프레임의 pose 만 쓴다. resolveRobotPose 는 map TF 가
  // 아직 없으면 odom 기준 pose 를 대신 돌려주는데(지도 그리기용 폴백), 그 좌표를 POI 로 저장하면
  // 맵 좌표와 어긋난 위치가 남는다.
  const poiRobotPose = useMemo(() => (robotPose?.frame === MAP_FRAME ? robotPose : null), [robotPose])

  const isMoving = isNavMoving(navStatus)
  const isRotating = isSpinning(spinStatus)
  const gotoState = navStatus?.goto?.state ?? null
  // GKR 재정위는 로봇이 제자리에서 한 바퀴 돌아야 진행된다 — 그 단계에서만 회전 버튼을 노출한다.
  const needsGkrSpin = lioStatus === 'relocalizing_gkr'
  // 측위 완료 = 맵이 로드되고 재정위까지 끝난 상태. 이때만 지도/이동이 의미가 있다.
  const isLocalized = lioStatus === 'ready'
  // 측위가 끝나면 편집 대상 맵이 로봇에 올라간 맵으로 고정된다 — 다른 맵을 고르면 화면의 POI 와
  // 로봇이 보는 맵이 어긋나므로, '다른 맵 로딩'을 누르기 전까지 맵 선택이 확정된 것으로 본다.
  const isMapSettled = isLocalized && !isSwitchingMap
  // 맵 선택과 맵 로드를 잠그는 조건. 재정위(relocalizing_gkr) 중에도 잠근다 — 진행 중인 재정위를
  // 다른 맵으로 덮어쓰면 로봇이 어느 맵을 기준으로 도는지 알 수 없게 된다.
  const isMapSelectLocked = isMapSettled || needsGkrSpin

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

  // 저장된 맵 목록 조회. 진입 직후 편집 대상이 정해져 있어야 하므로 작업 중인 맵을 골라 둔다
  // (pickWorkingMap: inactive 우선, 없으면 active).
  useEffect(() => {
    let alive = true
    mapApi
      .list()
      .then((res) => {
        if (!alive) return
        // archived(업로드로 대체된 이전 맵)는 편집 대상이 아니므로 뺀다.
        const items = visibleMaps(res?.data)
        setMaps(items)
        setSelectedMapId((current) =>
          items.some((map) => String(map.id) === String(current)) ? current : String(pickWorkingMap(items)?.id ?? '')
        )
      })
      .catch(() => {
        if (!alive) return
        setMaps([])
        setSelectedMapId('')
      })
    return () => {
      alive = false
    }
  }, [])

  // POI 버전은 선택한 맵 레코드에서 온다(POI 일괄 적용의 기준 버전).
  useEffect(() => {
    setPoiVersion(mapRecord?.poiVersion ?? null)
  }, [mapRecord])

  // 편집 대상 맵이 바뀌면 이전 위치를 가리키던 말풍선은 의미가 없다.
  useEffect(() => {
    setNavTarget(null)
  }, [mapId])

  /**
   * 선택한 맵을 로봇에 로드한다(측위 모드 전환).
   * 응답은 3D 맵 로드까지만 보장하므로 이후 진행은 /lio_node/status 배지로 확인한다.
   *
   * @param {{armAutoSpin?: boolean}} [options] armAutoSpin: 이 로드로 시작된 GKR 재정위에서
   *   제자리 회전을 자동으로 걸지 여부. 버튼 클릭은 true, 진입 시 자동 로드는 false —
   *   화면에 들어온 것만으로 로봇이 돌기 시작하면 안 된다.
   */
  const handleLoadMap = useCallback(
    async ({ armAutoSpin = true } = {}) => {
      if (!mapDir) {
        toast.error(t('noMapSelected'), { autoClose: 3000 })
        return
      }
      setIsLoadingMap(true)
      try {
        const response = await mapApi.loadMapForLocalization({ mapPath: mapDir })
        toast.success(response?.data?.message || t('mapLoadRequested'), { autoClose: 2000 })
        // 이 요청으로 시작된 재정위에서는 회전을 자동으로 걸어준다(아래 effect).
        if (armAutoSpin) autoSpinArmedRef.current = true
        setIsSwitchingMap(false)
      } catch (error) {
        const message = error?.response?.data?.error?.message || error?.message || 'Request failed'
        toast.error(message, { autoClose: 3000 })
      } finally {
        setIsLoadingMap(false)
      }
    },
    [mapDir, t]
  )

  // 진입 시 자동 맵 로딩 — 작업 중인 맵(inactive 우선)이 이미 선택돼 있으므로 그 맵을 그대로 올린다.
  // POI 편집은 로봇이 그 맵을 물고 있어야(측위) 지도 위 좌표가 맞으므로, 매번 버튼을 누르게 할 이유가 없다.
  //
  // 회전은 걸지 않는다(armAutoSpin: false) — 화면에 들어온 것만으로 로봇이 제자리에서 돌기 시작하면
  // 안 된다. GKR 재정위 단계에서 회전이 필요하면 사용자가 회전 버튼(또는 맵 로드 버튼)으로 시작한다.
  //
  // 단 한 번만, 그리고 "로봇이 아직 맵을 물고 있지 않을 때만" 건다:
  //   - unknown : 상태 토픽을 아직 못 받았다 → 판단 보류(여기서 걸면 이미 측위된 로봇을 다시 돌린다)
  //   - saving  : /save_map 처리 중 → 끝나고 mapping 으로 돌아오면 그때 건다
  //   - mapping : 맵을 안 물고 있다 → 자동 로드
  //   - 그 외(localization/failed) : 이미 로드했거나 진행 중 → 건드리지 않는다.
  //     다시 로드하면 추정 위치를 잃고 GKR 360° 재정위를 처음부터 다시 하게 된다.
  const autoLoadedRef = useRef(false)
  useEffect(() => {
    if (autoLoadedRef.current || isLoadingMap || !mapDir) return
    const mode = resolveMappingMode(lioStatus)
    if (mode === 'unknown' || mode === 'saving') return
    autoLoadedRef.current = true
    if (mode !== 'mapping') return
    handleLoadMap({ armAutoSpin: false })
  }, [mapDir, lioStatus, isLoadingMap, handleLoadMap])

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
  const handleSpin = useCallback(async () => {
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
  }, [t])

  // 맵 로드 요청이 GKR 재정위 단계로 넘어가면 회전을 자동으로 시작한다 — 이 단계는 로봇이 한 바퀴
  // 돌아야 진행되므로 사용자가 버튼을 한 번 더 누를 이유가 없다.
  // 맵 로드로 무장(autoSpinArmedRef)했을 때만 걸어서, 화면에 들어왔을 때 이미 재정위 중이던
  // 로봇에게 예고 없이 회전을 시키지 않는다.
  useEffect(() => {
    if (!needsGkrSpin || !autoSpinArmedRef.current) return
    if (isRotating || isSendingSpin) return
    autoSpinArmedRef.current = false
    handleSpin()
  }, [needsGkrSpin, isRotating, isSendingSpin, handleSpin])

  /** 진행 중인 제자리 회전 정지 — nav_spin_stop. */
  const handleStopSpin = useCallback(async () => {
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
  }, [t])

  // 회전은 GKR 재정위를 진행시키기 위한 것이므로, 측위가 끝나면(status ready) 남은 각도를 더 돌 이유가
  // 없다 — nav_spin_once 는 요청한 각도를 마칠 때까지 돌기 때문에 여기서 대신 정지를 걸어준다.
  // 상태 토픽이 하트비트로 반복 발행되고 spin_status 가 lio status 보다 늦게 올 수도 있으므로,
  // ready 인 동안 회전이 보이면 한 번만 정지를 보내고 ready 를 벗어날 때 다시 무장한다.
  const autoStoppedSpinRef = useRef(false)
  useEffect(() => {
    if (!isLocalized) {
      autoStoppedSpinRef.current = false
      return
    }
    if (!isRotating || autoStoppedSpinRef.current) return
    autoStoppedSpinRef.current = true
    handleStopSpin()
  }, [isLocalized, isRotating, handleStopSpin])

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
  // 저장 후 단계 완료 판정에도 이 결과를 쓰므로 조회한 목록을 돌려준다(실패 시 빈 배열).
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
      const items = res.data ?? []
      setPois(items)
      setState('STATE_EDITING')
      return items
    } catch (error) {
      console.error('[SemanticPage] POI 조회 실패:', error)
      setState('STATE_IDLE')
      return []
    }
  }, [mapId])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const onSave = async (workingPois) => {
    const toCreatPois = []
    const toUpadtePois = []

    for (const poi of workingPois) {
      console.log('needToSave :', poi.editStatus.needToSave)
      if (poi.editStatus.needToSave) {
        if (!poi.editStatus.tempSaved) {
          console.log('case 1')
          poi.editStatus = {
            ...poi.editStatus,
            needToSave: false,
            tempSaved: true
          }
          toCreatPois.push(poi)
        } else if (poi.editStatus.tempSaved) {
          console.log('case 2')
          poi.editStatus = {
            ...poi.editStatus,
            needToSave: false
          }
          toUpadtePois.push(poi)
        }
      }
    }

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

    // 저장 결과를 다시 읽어(= 서버에 남은 POI) 화면을 갱신한다.
    const saved = await fetchData()

    // POI 가 실제로 남아 있을 때만 시맨틱 단계를 완료로 기록한다 — 다음 작업 단계(업로드)를 가리킨다.
    // 이 기록이 없으면 currentStep 이 시맨틱에 머물러 업로드 화면이 잠긴 채로 남는다(router/routes.jsx).
    // POI 가 하나도 없는 상태로는 통과시키지 않는다.
    if (saved.length > 0) {
      await tryAdvanceSetupProgress(SETUP_STEPS.UPLOAD)
    }
  }

  const onCancel = () => {
    fetchData()
  }

  return (
    <StyledSemanticPageContent className="column">
      <Title>{t('semanticPageTitle')}</Title>

      <LocationRow>
        {/* 편집할 맵 선택 — 측위 완료(ready) 또는 재정위 중에는 잠긴다(로봇에 올라간 맵으로 고정) */}
        <Dropdown
          label={t('mapSelect')}
          size="md"
          value={selectedMapId}
          options={mapOptions}
          placeholder={t('noMaps')}
          onChange={setSelectedMapId}
          disabled={isMapSelectLocked || mapOptions.length === 0}
        />

        <BadgeRow>
          {/* 선택한 맵을 로봇에 로드(측위 전환) — 이동 명령의 전제다.
              측위가 끝나(ready) 지도가 올라온 뒤에는 할 일이 없으므로 버튼을 감추고,
              '다른 맵 로딩'으로 맵 선택을 다시 열었을 때만 되살린다.
              재정위(relocalizing_gkr) 중에는 자리를 지키되 비활성으로 둔다 — 진행 중인 재정위가
              끝나면 다시 누를 수 있다는 것을 보이려면 버튼을 감추지 않는 편이 낫다.
              진입 시 맵을 안 물고 있으면 자동으로 한 번 걸린다(위 autoLoadedRef effect). 이 버튼은
              자동 로드를 건너뛴 경우(상태 미수신·로드 실패)와 다른 맵으로 갈아탈 때 쓰고,
              GKR 재정위 회전을 자동으로 거는 것도 이 버튼을 통한 로드뿐이다(자동 로드는 걸지 않는다). */}
          {!isMapSettled && (
            <Button
              size="md"
              onClick={() => handleLoadMap()}
              disabled={!mapDir || isLoadingMap || isMapSelectLocked}
              title={mapDir || t('noMapSelected')}
            >
              {isLoadingMap ? t('waitingForData') : t('loadMap')}
            </Button>
          )}

          {/* 측위가 끝난 뒤 다른 맵으로 갈아타는 입구 — 맵 선택과 맵 로드 버튼을 다시 연다.
              주행 중(nav 상태 RUNNING)에는 잠근다 — 이동 중에 기준 맵을 바꾸면 진행 중인 목표가
              어느 맵의 좌표인지 알 수 없게 된다. 먼저 정지 버튼으로 멈춰야 한다. */}
          {isMapSettled && (
            <Button
              size="md"
              theme="tertiary"
              onClick={() => setIsSwitchingMap(true)}
              disabled={isMoving}
              title={isMoving ? t('navMovingHint') : undefined}
            >
              {t('loadAnotherMap')}
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
          poiVersion={poiVersion}
          poiList={pois}
          onSave={onSave}
          onCancel={onCancel}
          // POI 상세의 '현재 위치로 설정' 버튼용. 지도(map) 프레임일 때만 넘긴다 — TF 가 아직
          // 안 모여 odom 기준 pose 가 잡힌 경우 그 좌표는 맵 좌표가 아니라 POI 로 쓸 수 없다.
          robotPose={poiRobotPose}
          noData={t('noPoiLoaded')}
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
