import React, { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useFoxglove } from '@/hooks/useFoxglove'
import ConnectionBar from '@/components/ConnectionBar'
import { LocationBar, resolveLocationName, Section, Title } from '@repo/ui'
import MapCanvas from '@/components/MapCanvas'
import StatusPanel from '@/components/StatusPanel'
import { list as listBuildings } from '@/apis/buildingApis'
import { list as listFloors } from '@/apis/floorApis'
import { list as listAreas } from '@/apis/areaApis'
import { NAV_STATUS_TOPICS, STATUS_TOPICS } from '@/constants/topics'
import { resolveMappingMode } from '@/utils/lioStatus'
import { syncLevelSelection } from '@/utils/location'
import { useLocationStore } from '@/stores/useLocationStore'
import { isNavMoving, parseNavStatus, summarizeNavStatus } from '@/utils/navStatus'
import { resolveWsUrl } from '@/utils/wsUrl'
import { StyledMapPageContent, BadgeRow, MapWorkspace, LocationRow, MappingStatusBadge } from './styles'

/**
 * Map
 *
 * 메인 페이지.
 * - wsUrl 상태 관리
 * - useFoxglove 훅으로 데이터 수신
 * - 위치 계층(Building/Floor/Area) 목록 조회 및 선택 상태 관리 (LocationBar 는 표현만 담당)
 * - ConnectionBar + MapCanvas + StatusPanel 조합
 *
 * 레이아웃은 cms 콘텐츠 페이지와 동일한 구성이다
 * (StyledPageContent > Title / 위치 선택 / Section):
 * ┌────────────────────────────────────────────┐
 * │ Title (페이지 제목)                          │
 * │ LocationBar (위치 선택)      [매핑 상태 배지] │
 * │ ┌─ Section ───────────────┐ ┌─ Section ──┐ │
 * │ │ ConnectionBar (툴바)     │ │ StatusPanel│ │
 * │ │ MapCanvas               │ │ (정보 패널) │ │
 * │ │ (지도 + 라이다 + 로봇)    │ │            │ │
 * │ └─────────────────────────┘ └────────────┘ │
 * └────────────────────────────────────────────┘
 */
/** 맵 이름은 단일 경로 세그먼트여야 한다(BE resolveSavePath 가 하위 경로 표기를 400 으로 거부). */
const sanitizeSegment = (value) =>
  String(value)
    .trim()
    .replace(/[/\\]+/g, '_')

/**
 * 선택된 위치 계층으로 저장할 맵 이름과 매핑 시작 가능 여부를 계산한다.
 *
 * 건물 정보를 못 받아온 경우(목록이 비어 있음)는 고를 위치가 없으므로 이름을 'Default' 로 두고
 * 매핑 시작을 허용한다 — 위치 계층 없이 쓰는 로봇도 매핑은 해야 한다.
 * 건물 정보가 있으면 목록을 받아온 계층이 모두 선택돼야 시작할 수 있고(Floor/Area 도 내려오면 셋 다),
 * 이름은 선택된 값들을 Building명-Floor명-Area명 순으로 잇는다.
 */
const resolveMappingTarget = ({ buildings, floors, areas, location, language }) => {
  if (!buildings.length) return { mapName: 'Default', canStart: true }

  const levels = [
    [buildings, location.buildingId],
    [floors, location.floorId],
    [areas, location.areaId]
  ]

  const parts = []
  for (const [items, selectedId] of levels) {
    if (!items.length) continue
    if (!selectedId) return { mapName: '', canStart: false }
    const selected = items.find((item) => String(item.id) === String(selectedId))
    parts.push(sanitizeSegment(resolveLocationName(selected, language)))
  }

  return { mapName: parts.filter(Boolean).join('-') || 'Default', canStart: true }
}

export default function Map() {
  const { t, i18n } = useTranslation('map')
  const [wsUrl, setWsUrl] = useState(resolveWsUrl)
  const [fps, setFps] = useState(10) // 기본 10 FPS 업데이트 주기
  // 위치 선택은 스토어가 들고 있다 — 맵 스캔/시맨틱이 같은 작업 위치를 공유하고 새로고침에도 유지된다.
  // zustand v5 는 객체를 만들어 돌려주는 셀렉터가 매 렌더 새 참조를 내므로 필드 단위로 구독한다.
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

  // 위치 계층 목록 조회. 상위 선택이 바뀌면 하위 목록을 다시 받아온다
  // (하위 선택 초기화는 LocationBar 의 onChange 가 넘겨주는 값으로 처리된다).
  //
  // 스토어에 남아 있던 선택을 목록과 맞춘 뒤(없어진 id 는 비움), 비어 있으면 첫 항목으로 채운다
  // (utils/location.js syncLevelSelection) — 셋 다 선택돼야 매핑을 시작할 수 있고(맵 이름이 곧 위치),
  // 상위가 정해지면 하위 조회가 이어지므로 Building → Floor → Area 가 차례로 채워진다.
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

  // 저장 후 만들 맵 레코드의 소속. siteId 는 별도 조회 없이 선택된 건물 레코드에서 가져온다
  // (Building.siteId — BE building 모델의 FK).
  const selectedBuilding = useMemo(
    () => buildings.find((item) => String(item.id) === String(buildingId)) ?? null,
    [buildings, buildingId]
  )
  const mapOwner = useMemo(() => ({ siteId: selectedBuilding?.siteId, areaId }), [selectedBuilding, areaId])

  const { mapName, canStart: canStartMapping } = useMemo(
    () => resolveMappingTarget({ buildings, floors, areas, location, language: i18n.language }),
    [buildings, floors, areas, location, i18n.language]
  )

  const {
    status,
    mapData,
    odomData,
    scanData,
    robotPose,
    frameCorrections,
    topics,
    subscribedTopics,
    customTopicsData,
    toggleSubscribe,
    subscribeTopics,
    unsubscribeTopics,
    connect,
    disconnect
  } = useFoxglove(wsUrl, fps)

  // 매핑 진행 상태는 폴링이 아니라 /lio_node/status 구독으로 들어온다.
  // 상태 토픽 이름은 로봇 구성에 따라 달라서 구독 목록에서 실제로 잡힌 것을 쓴다.
  const statusTopic = STATUS_TOPICS.find((topic) => subscribedTopics.includes(topic)) ?? null
  const mappingStatus = statusTopic ? customTopicsData[statusTopic]?.data : null
  // 세분된 status 값은 배지에 그대로 보여주고, 조작부(ConnectionBar)에는 모드로 접어 넘긴다.
  const mappingMode = resolveMappingMode(mappingStatus)
  const isMapping = mappingMode === 'mapping' || mappingMode === 'saving'

  // 주행 진행 상태도 같은 방식이다 — 이동 명령은 gRPC(navApis)로 보내고 상태는 토픽으로만 받는다.
  // payload 는 std_msgs/String 에 담긴 JSON 이라 파싱이 한 단계 더 필요하다.
  const navStatusTopic = NAV_STATUS_TOPICS.find((topic) => subscribedTopics.includes(topic)) ?? null
  const navStatus = useMemo(
    () => parseNavStatus(navStatusTopic ? customTopicsData[navStatusTopic]?.data : null),
    [navStatusTopic, customTopicsData]
  )
  const navSummary = summarizeNavStatus(navStatus)

  return (
    <StyledMapPageContent className="column">
      <Title>{t('pageTitle')}</Title>

      <LocationRow>
        {/* 위치 계층 선택 (Building > Floor > Area) */}
        <LocationBar buildings={buildings} floors={floors} areas={areas} value={location} onChange={setLocation} />

        {/* 상태 배지 묶음 — LocationRow 가 space-between 이라 배지를 감싸야 오른쪽에 붙는다
            (배지 두 개를 그대로 두면 가운데 하나가 중앙에 떠 보인다). */}
        <BadgeRow>
          {/* 매핑 진행 상태 (/lio_node/status) */}
          <MappingStatusBadge $active={isMapping}>
            <span className="label typographyBody5">{t('status')}</span>
            <strong className="value typographyBody5">{mappingStatus || t('waitingForData')}</strong>
          </MappingStatusBadge>

          {/* 주행 진행 상태 (/robot_hub/nav_action_status) */}
          <MappingStatusBadge $active={isNavMoving(navStatus)}>
            <span className="label typographyBody5">{t('navStatus')}</span>
            <strong className="value typographyBody5">{navSummary || t('waitingForData')}</strong>
          </MappingStatusBadge>
        </BadgeRow>
      </LocationRow>

      <MapWorkspace>
        {/* 지도 Section — 연결·매핑 툴바 + 지도/라이다 캔버스 */}
        <Section gap="1.2rem">
          <ConnectionBar
            url={wsUrl}
            onUrlChange={setWsUrl}
            status={status}
            onConnect={connect}
            onDisconnect={disconnect}
            fps={fps}
            onFpsChange={setFps}
            mapName={mapName}
            canStartMapping={canStartMapping}
            mode={mappingMode}
            mapOwner={mapOwner}
            mapInfo={mapData?.info ?? null}
            t={t}
          />

          <MapCanvas
            mapData={mapData}
            scanData={scanData}
            odomData={odomData}
            robotPose={robotPose}
            subscribedTopics={subscribedTopics}
            customTopicsData={customTopicsData}
            frameCorrections={frameCorrections}
            t={t}
          />
        </Section>

        {/* 정보 패널 — 토픽 정보 / 토픽 목록 / 범례를 각각 Section 으로 쌓는다 */}
        <StatusPanel
          status={status}
          wsUrl={wsUrl}
          mapData={mapData}
          odomData={odomData}
          scanData={scanData}
          topics={topics}
          subscribedTopics={subscribedTopics}
          customTopicsData={customTopicsData}
          toggleSubscribe={toggleSubscribe}
          subscribeTopics={subscribeTopics}
          unsubscribeTopics={unsubscribeTopics}
          t={t}
        />
      </MapWorkspace>
    </StyledMapPageContent>
  )
}
