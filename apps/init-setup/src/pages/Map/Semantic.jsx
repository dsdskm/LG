import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'react-toastify'
import { Button, Dropdown, Section, SemanticPage, Title } from '@repo/ui'
import MapCanvas from '@/components/MapCanvas'
import { useTelemetry } from '@/hooks/useTelemetry'
import { useEmergencyKey } from '@/hooks/useEmergencyKey'
import EmergencyKeyBadge from './EmergencyKeyBadge'
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
import { MAP_FRAME, yawOf } from '@/utils/tf'
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

/** POI 표시 이름 — 지도 마커 라벨(MapCanvas)과 같은 규약. */
const poiLabel = (poi) => poi?.name?.default ?? poi?.name?.['ko-KR'] ?? poi?.name?.['en-US'] ?? ''

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
  // 맵 로드 요청으로 시작된 재정위인지 — 그때만 회전을 자동으로 건다.
  const autoSpinArmedRef = useRef(false)
  // 무장 시점에 이미 재정위(relocalizing_gkr) 중이었는지. 그렇다면 그 상태가 한 번 풀린 뒤
  // 다시 재정위로 들어올 때만 회전을 건다 — 재정위 중에 다른 맵을 로드하면 상태값이 계속
  // relocalizing_gkr 이라, 새 맵이 올라오기도 전에 이전 재정위에 회전을 걸어 1회 무장을 소모한다.
  const autoSpinWaitsForNewGkrRef = useRef(false)
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
    customTopicsUpdatedAt,
    connect,
    disconnect
  } = useTelemetry(wsUrl, 10)

  // 비상정지 버튼(하드웨어 키) 상태 — /emergency_key_status.
  // 눌려 있으면 제자리 회전을 걸어도 로봇이 돌지 않는다(모터 STO). 배지로 상태를 보여주고
  // 회전 요청은 아래 handleSpin 이 막는다.
  const emergency = useEmergencyKey(subscribedTopics, customTopicsData, customTopicsUpdatedAt)

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
  // 회전 요청이 나가 있거나 진행 중 — 정지 상태 판단은 spin_status 하트비트에 의존하므로
  // 방금 보낸 요청(isSendingSpin)까지 함께 봐야 "회전 중이 아니다" 를 신뢰할 수 있다.
  const isSpinBusy = isRotating || isSendingSpin
  const gotoState = navStatus?.goto?.state ?? null
  // GKR 재정위는 로봇이 제자리에서 한 바퀴 돌아야 진행된다 — 그 단계에서 회전 버튼을 노출한다.
  const needsGkrSpin = lioStatus === 'relocalizing_gkr'
  // 측위 완료 = 맵이 로드되고 재정위까지 끝난 상태. 이때만 지도/이동이 의미가 있다.
  const isLocalized = lioStatus === 'ready'
  // 맵 로드를 잠그는 조건. 맵 선택 자체는 어떤 상태에서도 열어 둔다 — 잘못된 맵을 골랐다는 것은
  // 보통 측위가 한참 진행된 뒤에 알게 되므로, 끝날 때까지 기다리게 하면 갈아탈 방법이 없다.
  // 로봇이 움직이는 중(주행/회전)에만 막는다: 움직이는 도중에 기준 맵이 갈리면 진행 중인 목표나
  // 재정위가 어느 맵의 좌표인지 알 수 없게 된다.
  const isMapLoadLocked = isMoving || isSpinBusy

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

  // TODO(격자맵 재로드): lio_load_grid_map 핸들러가 로봇에 반영되기 전까지 호출을 막아 둔다.
  // 반영되면 이 refs / handleLoadMap 의 무장 / 아래 effect 주석을 함께 해제한다.
  //
  // 맵 로드가 성공하면 무장되고, 그 로드가 측위 완료(ready)에 이르렀을 때 격자맵 재로드를 한 번 건다.
  // 대상 경로는 무장 시점의 맵 디렉터리를 들고 간다 — 측위가 끝나기 전에 맵 선택을 바꿔도
  // 방금 로드한 맵의 격자맵을 로드해야 한다.
  // const gridLoadArmedRef = useRef(false)
  // const gridLoadTargetRef = useRef(null)

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
      // 이전 로드의 무장은 버린다 — 이 로드로 시작되는 재정위만 자동 회전 대상이다.
      autoSpinArmedRef.current = false
      // gridLoadArmedRef.current = false
      try {
        const response = await mapApi.loadMapForLocalization({ mapPath: mapDir })
        toast.success(response?.data?.message || t('mapLoadRequested'), { autoClose: 2000 })
        // 측위가 끝나면(ready) 이 맵의 2D 격자맵을 한 번 다시 로드한다(아래 effect).
        // gridLoadArmedRef.current = true
        // gridLoadTargetRef.current = mapDir
        // 이 요청으로 시작된 재정위에서는 회전을 자동으로 걸어준다(아래 effect).
        // 지금 이미 재정위 중이면 그 재정위는 이전 맵의 것이므로, 상태가 한 번 풀릴 때까지 기다린다.
        if (armAutoSpin) {
          autoSpinArmedRef.current = true
          autoSpinWaitsForNewGkrRef.current = needsGkrSpin
        }
      } catch (error) {
        const message = error?.response?.data?.error?.message || error?.message || 'Request failed'
        toast.error(message, { autoClose: 3000 })
      } finally {
        setIsLoadingMap(false)
      }
    },
    [mapDir, needsGkrSpin, t]
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

  // 맵 로드가 측위 완료(ready)까지 갔으면 그 맵의 2D 격자맵을 다시 로드한다
  // (POST /robot-hub/load-grid-map → lio_load_grid_map).
  //
  // lio_node 도 재정위 성공 직후 스스로 한 번 로드하지만(status: loading_grid_map → ready),
  // grid_map_node 가 늦게 떠서 서비스가 준비되지 않았으면 경고만 남기고 ready 로 넘어간다
  // (lio_node.cpp requestGridMapLoad). 그러면 지도 칸이 비어 있고 POI 를 얹을 기준이 없으므로,
  // 로드에 성공한 맵에 대해서는 한 번 더 확실히 건다. 이미 올라와 있으면 같은 격자맵이
  // /lio/grid_map 으로 다시 발행될 뿐이라 재로드가 화면을 흐트러뜨리지 않는다.
  //
  // status 는 1Hz 하트비트로 같은 값이 계속 오므로, 무장을 먼저 풀어 정확히 1회만 호출한다.
  //
  // TODO(격자맵 재로드): lio_load_grid_map 핸들러 반영 전이라 아직 호출하지 않는다.
  // API(apis/mapApis.loadGridMap)와 BE(POST /robot-hub/load-grid-map)는 이미 연결돼 있으므로
  // 로봇에 핸들러가 올라가면 위 refs/무장과 함께 이 블록만 해제하면 된다.
  // useEffect(() => {
  //   if (!gridLoadArmedRef.current || lioStatus !== 'ready') return
  //   const savePath = gridLoadTargetRef.current
  //   gridLoadArmedRef.current = false
  //   gridLoadTargetRef.current = null
  //   if (!savePath) return
  //   mapApi.loadGridMap({ savePath }).catch((error) => {
  //     // 격자맵 재로드 실패는 측위 실패가 아니다 — 화면은 그대로 두고 토스트로만 알린다.
  //     const message = error?.response?.data?.error?.message || error?.message || 'Request failed'
  //     toast.error(message, { autoClose: 3000 })
  //   })
  // }, [lioStatus])

  // 지도 클릭 → 그 지점의 월드 좌표를 말풍선으로 띄운다(아직 이동하지 않는다).
  // 기존 POI 마커를 눌렀으면 MapCanvas 가 그 POI 를 함께 넘겨준다 — 말풍선이 POI 이름을 보여주고
  // 이동은 클릭 좌표가 아니라 POI 에 저장된 pose(방향 포함)로 건다.
  const handleMapClick = useCallback(({ x, y, canvasX, canvasY, poi = null }) => {
    setNavTarget({ x, y, canvasX, canvasY, poi })
  }, [])

  // 줌/팬이 일어나면 말풍선 위치(캔버스 픽셀 기준)가 클릭 지점과 어긋나므로 닫는다.
  const handleViewChange = useCallback(() => {
    setNavTarget(null)
  }, [])

  /**
   * 이동 명령 — nav_goto. 도착 여부는 응답으로 알 수 없으므로 주행 상태 배지로 확인한다.
   * @param {{x: number, y: number, yaw?: number}} target yaw 는 도(degree). 생략하면 방향을 지정하지 않는다.
   */
  const sendGoto = useCallback(
    async (target) => {
      setIsSendingGoto(true)
      try {
        const response = await navGoto(target)
        toast.success(response?.data?.message || t('navGotoRequested'), { autoClose: 2000 })
        setNavTarget(null)
      } catch (error) {
        const message = error?.response?.data?.error?.message || error?.message || 'Request failed'
        toast.error(message, { autoClose: 3000 })
      } finally {
        setIsSendingGoto(false)
      }
    },
    [t]
  )

  /**
   * POI 로 이동 — 지도 마커 말풍선과 POI 목록의 이동 버튼이 같이 쓴다.
   * POI 는 도착 지점의 방향까지 뜻하므로 저장된 orientation 을 yaw(도)로 바꿔 함께 보낸다
   * (방향이 없는 POI 는 identity 쿼터니언이라 yaw 0 이 되고, 그대로 보내도 의미가 같다).
   */
  const handlePoiGoto = useCallback(
    (poi) => {
      const position = poi?.pose?.position
      if (typeof position?.x !== 'number' || typeof position?.y !== 'number') {
        toast.error(t('navPoiNoPosition'), { autoClose: 3000 })
        return
      }
      const quat = poi?.pose?.orientation
      const yaw = quat ? (yawOf(quat) * 180) / Math.PI : 0
      sendGoto({ x: position.x, y: position.y, yaw })
    },
    [sendGoto, t]
  )

  /** 말풍선의 이동 버튼 — POI 를 집었으면 그 POI 로, 빈 곳을 눌렀으면 클릭 좌표로 이동한다. */
  const handleGoto = () => {
    if (!navTarget) return
    if (navTarget.poi) {
      handlePoiGoto(navTarget.poi)
      return
    }
    sendGoto({ x: navTarget.x, y: navTarget.y })
  }

  /**
   * GKR 재정위용 제자리 회전 — nav_spin_once(기본 360°).
   * 실행은 motor-2wheel 이 /cmd_vel 로 처리하므로 측위 전에도 동작한다.
   * 진행은 /robot_hub/nav_spin_status 배지로 확인한다.
   */
  const handleSpin = useCallback(async () => {
    // 비상정지 버튼이 눌려 있으면 요청을 보내지 않는다 — 모터가 잠겨 있어 회전은 시작되지 않는데
    // spin_status 는 진행 중으로 잡혀(요청은 접수된다) 회전 중 판정이 걸려 맵 로드까지 잠긴다.
    // 자동 회전(아래 GKR effect)도 이 함수를 거치므로 여기서 한 번만 막으면 된다.
    if (emergency.isLocked) {
      toast.error(t('emergencyKeyBlockedSpin'), { autoClose: 4000 })
      return
    }
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
  }, [emergency.isLocked, t])

  // 맵 로드 요청이 GKR 재정위 단계로 넘어가면 회전을 자동으로 시작한다 — 이 단계는 로봇이 한 바퀴
  // 돌아야 진행되므로 사용자가 버튼을 한 번 더 누를 이유가 없다.
  // 맵 로드로 무장(autoSpinArmedRef)했을 때만 걸어서, 화면에 들어왔을 때 이미 재정위 중이던
  // 로봇에게 예고 없이 회전을 시키지 않는다.
  useEffect(() => {
    // 재정위를 벗어났다 — 다음에 들어오는 재정위는 마지막 로드가 만든 것이므로 대기를 푼다.
    if (!needsGkrSpin) {
      autoSpinWaitsForNewGkrRef.current = false
      return
    }
    if (!autoSpinArmedRef.current || autoSpinWaitsForNewGkrRef.current) return
    if (isRotating || isSendingSpin) return
    // 비상정지 버튼이 눌려 있으면 무장을 소모하지 않고 기다린다 — 여기서 걸면 회전은 시작되지도
    // 않은 채 1회 무장만 없어져, 버튼을 풀어도 자동 회전이 다시 걸리지 않는다.
    // (handleSpin 이 잠금 여부를 의존성으로 갖고 있어, 풀리는 순간 이 effect 가 다시 돈다.)
    if (emergency.isLocked) return
    autoSpinArmedRef.current = false
    handleSpin()
  }, [needsGkrSpin, isRotating, isSendingSpin, emergency.isLocked, handleSpin])

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
  //
  // 한 번만 보내고 끝내면 정지가 먹지 않았을 때(요청 실패, 또는 spin 액션이 아직 goal 을 받지 않은
  // 상태에서 정지가 도착해 무시되는 경우) 로봇이 계속 도는데 화면은 손을 놓는다 — ready 로 바뀌었는데
  // 회전이 멈추지 않는 증상이 이 경로다. 그래서 회전이 보이는 동안 최대 3회까지 다시 보낸다.
  // 재시도는 2초 간격이다: 정지 요청이 반영돼도 spin_status 하트비트가 한두 틱 뒤에 꺼지므로
  // 곧바로 재시도하면 이미 처리된 정지를 중복으로 보낸다.
  // 3회로 끝내는 이유는 무한 요청 루프를 막기 위한 것이고, 그 뒤에는 사용자가 정지 버튼으로 처리한다
  // (그 버튼은 ready 에서도 회전 중이면 보인다 — 아래 렌더 참고).
  const AUTO_STOP_SPIN_MAX_TRIES = 3
  const AUTO_STOP_SPIN_RETRY_MS = 2000
  const autoStopSpinTriesRef = useRef(0)
  useEffect(() => {
    // ready 를 벗어나거나 회전이 멈추면 시도 횟수를 초기화한다(다음 회전에 다시 3회를 쓴다).
    if (!isLocalized || !isRotating) {
      autoStopSpinTriesRef.current = 0
      return
    }
    if (isSendingSpin || autoStopSpinTriesRef.current >= AUTO_STOP_SPIN_MAX_TRIES) return

    const delay = autoStopSpinTriesRef.current === 0 ? 0 : AUTO_STOP_SPIN_RETRY_MS
    const timer = setTimeout(() => {
      autoStopSpinTriesRef.current += 1
      handleStopSpin()
    }, delay)
    return () => clearTimeout(timer)
  }, [isLocalized, isRotating, isSendingSpin, handleStopSpin])

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
        {/* 편집할 맵 선택 — 어떤 측위 상태에서도 열어 둔다. 맵을 잘못 골랐다는 것은 보통 측위가
            진행된 뒤에 알게 되므로, 잠가 두면 끝날 때까지 갈아탈 방법이 없다. 고른 맵을 로봇에
            실제로 올리는 것은 아래 맵 로드 버튼이고, 움직이는 중인지는 거기서 판단한다.
            맵 이름은 저장 디렉터리 이름까지 들어가 길어지므로 다른 화면의 표준 폭(180px)의 두 배를 준다
            — 기본값(내용 폭)으로는 이름이 잘려 어느 맵인지 구분되지 않았다. */}
        <Dropdown
          label={t('mapSelect')}
          size="md"
          minWidth="360px"
          value={selectedMapId}
          options={mapOptions}
          placeholder={t('noMaps')}
          onChange={setSelectedMapId}
          disabled={mapOptions.length === 0}
        />

        <BadgeRow>
          {/* 비상정지 버튼 상태 (/emergency_key_status) — 눌려 있으면 회전/이동이 실제로 일어나지 않는다 */}
          <EmergencyKeyBadge emergency={emergency} t={t} />

          {/* 선택한 맵을 로봇에 로드(측위 전환) — 이동 명령의 전제다. 측위가 끝난 뒤에도 계속
              노출한다: 다른 맵으로 갈아타는 입구가 이 버튼 하나이기 때문이다(별도의 '다른 맵 로딩'
              단계를 두면 잘못 고른 맵을 바로잡는 길이 두 단계로 늘어난다).
              로봇이 움직이는 중(주행/회전)에만 잠근다 — 움직이는 도중에 기준 맵이 갈리면 진행 중인
              목표나 재정위가 어느 맵의 좌표인지 알 수 없게 된다. 먼저 정지 버튼으로 멈춰야 한다.
              진입 시 맵을 안 물고 있으면 자동으로 한 번 걸린다(위 autoLoadedRef effect). 이 버튼은
              자동 로드를 건너뛴 경우(상태 미수신·로드 실패)와 다른 맵으로 갈아탈 때 쓰고,
              GKR 재정위 회전을 자동으로 거는 것도 이 버튼을 통한 로드뿐이다(자동 로드는 걸지 않는다). */}
          <Button
            size="md"
            onClick={() => handleLoadMap()}
            disabled={!mapDir || isLoadingMap || isMapLoadLocked}
            title={
              !mapDir ? t('noMapSelected') : isMoving ? t('navMovingHint') : isSpinBusy ? t('navSpinningHint') : mapDir
            }
          >
            {isLoadingMap ? t('waitingForData') : t('loadMap')}
          </Button>

          {/* 회전 버튼 — GKR 재정위 단계에서 회전을 시작하는 용도(로봇이 한 바퀴 돌아야 측위가 진행된다).
              회전 중이면 어느 상태에서든 정지 버튼으로 바뀐다: ready 로 바뀐 뒤에도 회전이 남아 있을 수
              있어서(자동 정지가 먹지 않는 경우) 손으로 멈출 길이 없으면 안 된다. */}
          {(needsGkrSpin || isRotating) &&
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
          // POI 목록 command 칸의 이동 버튼 — 지도 말풍선의 이동과 같은 동작이다.
          // 주행 중에는 새 목표를 겹쳐 보내지 않는다(상단 정지 버튼으로 먼저 멈춘다).
          onPoiGoto={handlePoiGoto}
          gotoDisabled={isSendingGoto || isMoving}
          gotoLabel={t('moveHere')}
          // 지도에는 목록에 보이는 POI 를 그린다 — SemanticPage 가 표시 중인 목록(IN-USE/WORKING)을
          // 넘겨주므로 아직 저장하지 않은 작업본 POI 도 지도에서 확인할 수 있다.
          // 지도 칸은 POI 와 고정장애물을 함께 그린다 — 고정장애물 편집 중에도 POI 가 어디 있는지
          // 보여야 영역을 어디에 잡을지 판단할 수 있다.
          mapSlot={({
            pois: visiblePois,
            obstacles,
            drawObstacleShape,
            onObstacleDrawn,
            selectedObstacleId,
            editingObstacleId,
            onObstacleResize,
            onObstacleVertexMove
          }) => (
            <MapClickArea>
              <MapCanvas
                mapData={mapData}
                scanData={scanData}
                odomData={odomData}
                robotPose={robotPose}
                subscribedTopics={subscribedTopics}
                customTopicsData={customTopicsData}
                frameCorrections={frameCorrections}
                pois={visiblePois}
                obstacles={obstacles}
                drawObstacleShape={drawObstacleShape}
                onObstacleDrawn={onObstacleDrawn}
                selectedObstacleId={selectedObstacleId}
                editingObstacleId={editingObstacleId}
                onObstacleResize={onObstacleResize}
                onObstacleVertexMove={onObstacleVertexMove}
                // POI 편집 화면이라 실시간 라이다 점군은 지도를 가리기만 한다
                showScan={false}
                onMapClick={handleMapClick}
                onViewChange={handleViewChange}
                t={t}
              />

              {/* 클릭 지점 말풍선 — 좌표 표시 + 이동.
                  고정장애물 영역을 그리는 중에는 감춘다 — 그때는 지도 클릭이 이동 목표가 아니라
                  사각형 그리기이므로, 남아 있는 말풍선은 지금 무엇을 하는 중인지 흐리게 만든다. */}
              {navTarget && !drawObstacleShape && (
                <NavBubble $x={navTarget.canvasX} $y={navTarget.canvasY}>
                  {/* POI 마커를 집었으면 어느 POI 인지 먼저 보여준다 — 좌표만으로는 확인이 안 된다 */}
                  {navTarget.poi && <strong className="poiName typographyBody5">{poiLabel(navTarget.poi)}</strong>}
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
          )}
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
