import { useState, useEffect, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'react-toastify'
import { LocationBar, Section, SemanticPage, Title } from '@repo/ui'
import MapCanvas from '@/components/MapCanvas'
import { useFoxglove } from '@/hooks/useFoxglove'
import { resolveWsUrl } from '@/utils/wsUrl'
import { StyledSemanticPageContent, LocationRow, EmptyMessage } from './styles'

import * as poiApi from '@/apis/mapPoiApis'
import * as mapApi from '@/apis/mapApis'
import { list as listBuildings } from '@/apis/buildingApis'
import { list as listFloors } from '@/apis/floorApis'
import { list as listAreas } from '@/apis/areaApis'

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

  const [location, setLocation] = useState({ buildingId: '', floorId: '', areaId: '' })
  const [buildings, setBuildings] = useState([])
  const [floors, setFloors] = useState([])
  const [areas, setAreas] = useState([])
  const [mapId, setMapId] = useState(null)

  // 왼쪽 지도 칸은 Map(스캔) 페이지와 같은 foxglove 캔버스를 쓴다.
  // 이 화면에는 연결 툴바가 없으므로 진입 시 바로 연결하고 떠날 때 끊는다
  // (구독은 advertise 를 받은 useFoxglove 가 역할별로 자동 처리한다).
  const [wsUrl] = useState(resolveWsUrl)
  const { mapData, odomData, scanData, subscribedTopics, customTopicsData, connect, disconnect } = useFoxglove(
    wsUrl,
    10
  )

  useEffect(() => {
    connect()
    return () => disconnect()
  }, [connect, disconnect])

  // 위치 계층 목록 조회. 상위 선택이 바뀌면 하위 목록을 다시 받아온다
  // (하위 선택 초기화는 LocationBar 의 onChange 가 넘겨주는 값으로 처리된다).
  useEffect(() => {
    let alive = true
    listBuildings()
      .then((res) => alive && setBuildings(res?.data || []))
      .catch(() => alive && setBuildings([]))
    return () => {
      alive = false
    }
  }, [])

  useEffect(() => {
    if (!location.buildingId) {
      setFloors([])
      return
    }
    let alive = true
    listFloors({ buildingId: location.buildingId })
      .then((res) => alive && setFloors(res?.data || []))
      .catch(() => alive && setFloors([]))
    return () => {
      alive = false
    }
  }, [location.buildingId])

  useEffect(() => {
    if (!location.floorId) {
      setAreas([])
      return
    }
    let alive = true
    listAreas({ floorId: location.floorId })
      .then((res) => alive && setAreas(res?.data || []))
      .catch(() => alive && setAreas([]))
    return () => {
      alive = false
    }
  }, [location.floorId])

  // 선택한 구역의 맵(POI 소속). 구역 하나에 맵이 여러 개면 최신 것을 쓴다(BE 가 createdAt DESC 로 내려준다).
  useEffect(() => {
    if (!location.areaId) {
      setMapId(null)
      return
    }
    let alive = true
    mapApi
      .list({ areaId: location.areaId })
      .then((res) => alive && setMapId(res?.data?.[0]?.id ?? null))
      .catch(() => alive && setMapId(null))
    return () => {
      alive = false
    }
  }, [location.areaId])

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
      </LocationRow>

      {/* POI 편집 — SemanticPage 가 Section(명령 버튼) + Section(지도 | 목록/상세)을 직접 내보낸다 */}
      {state === 'STATE_EDITING' ? (
        <SemanticPage
          poiList={pois}
          onSave={onSave}
          onCancel={onCancel}
          mapSlot={
            <MapCanvas
              mapData={mapData}
              scanData={scanData}
              odomData={odomData}
              subscribedTopics={subscribedTopics}
              customTopicsData={customTopicsData}
              t={t}
            />
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
