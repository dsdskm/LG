import React, { useState, useEffect, useMemo, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { StyledPageContent, Title, SectionRobot, OrganizationSelector, Dropdown, Table } from '@repo/ui'
import { mapApis, siteApis, deviceApis } from '@/apis'
import '../../index.css'

const MAP_TYPES = ['navi', 'poi', 'svg']
const TYPE_BADGE_STYLE = {
  navi: { background: '#dbeafe', color: '#2563eb' },
  poi: { background: '#dcfce7', color: '#16a34a' },
  svg: { background: '#fef3c7', color: '#d97706' }
}

const indexVersionsByType = (latestVersions = []) => {
  const map = {}
  latestVersions.forEach((v) => {
    if (v?.mapType) map[v.mapType] = v
  })
  return map
}

const OwnerBadge = ({ isRobot, t }) => (
  <span
    style={{
      padding: '2px 10px',
      borderRadius: '999px',
      fontSize: '1.1rem',
      fontWeight: 700,
      whiteSpace: 'nowrap',
      background: isRobot ? '#f3e8ff' : '#e8f4fd',
      color: isRobot ? '#7c3aed' : '#1a8bc5',
      pointerEvents: 'none' // 클릭이 셀(row-click)로 전달되도록
    }}
  >
    {isRobot ? t('mapMgmt.robotMap') : t('mapMgmt.siteMap')}
  </span>
)

// 존재하는 맵 유형(NAVI/POI/SVG) 배지. 하나도 없으면 '없음'
const MapTypeCell = ({ mapItem, t }) => {
  const noneEl = (
    <span style={{ fontSize: '1.3rem', color: 'var(--color-neutral-40)', pointerEvents: 'none' }}>{t('mapMgmt.none')}</span>
  )
  if (!mapItem) return noneEl
  const byType = indexVersionsByType(mapItem.latestVersions)
  const present = MAP_TYPES.filter((mt) => byType[mt])
  if (present.length === 0) return noneEl
  return (
    <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap', pointerEvents: 'none' }}>
      {present.map((mt) => (
        <span
          key={mt}
          style={{
            padding: '2px 8px',
            borderRadius: '999px',
            fontSize: '1.05rem',
            fontWeight: 700,
            background: TYPE_BADGE_STYLE[mt].background,
            color: TYPE_BADGE_STYLE[mt].color
          }}
        >
          {mt.toUpperCase()}
        </span>
      ))}
    </div>
  )
}

const MapManagement = () => {
  const navigate = useNavigate()
  const { t } = useTranslation('robot')

  const [org, setOrg] = useState({ groupId: null, siteId: null })
  const [siteGroupMap, setSiteGroupMap] = useState({})
  const [deviceNames, setDeviceNames] = useState({})
  const [buildings, setBuildings] = useState([]) // 선택 사이트의 buildings→floors→areas 계층
  const [items, setItems] = useState([]) // searchMaps 결과
  const [loading, setLoading] = useState(false)
  const [buildingFilter, setBuildingFilter] = useState('')
  const [floorFilter, setFloorFilter] = useState('')

  const effectiveGroupId = org.groupId || (org.siteId ? siteGroupMap[org.siteId] : null)
  const hasScope = !!(org.siteId && effectiveGroupId)

  // 사이트→그룹 매핑 + 로봇 이름
  useEffect(() => {
    let canceled = false
    Promise.allSettled([siteApis.getSites({}), deviceApis.getDevices({})]).then(([s, d]) => {
      if (canceled) return
      const val = (r) => (r.status === 'fulfilled' ? r.value : null)
      const siteList = Array.isArray(val(s)) ? val(s) : val(s)?.content || []
      const sg = {}
      siteList.forEach((site) => {
        const sid = site?.siteId ?? site?.id
        if (sid && site?.groupId) sg[sid] = site.groupId
      })
      setSiteGroupMap(sg)
      const devList = Array.isArray(val(d)) ? val(d) : val(d)?.content || []
      const dn = {}
      devList.forEach((dev) => {
        const id = dev?.deviceId ?? dev?.id
        if (id) dn[id] = dev?.deviceName ?? dev?.name ?? id
      })
      setDeviceNames(dn)
    })
    return () => {
      canceled = true
    }
  }, [])

  // 사이트 선택 시 계층 조회 + 필터 초기화
  useEffect(() => {
    setBuildingFilter('')
    setFloorFilter('')
    if (!org.siteId) {
      setBuildings([])
      return
    }
    let canceled = false
    siteApis
      .getSiteById(org.siteId)
      .then((data) => {
        if (!canceled) setBuildings(data?.buildings ?? [])
      })
      .catch((e) => {
        console.error('사이트 계층 조회 실패:', e)
        if (!canceled) setBuildings([])
      })
    return () => {
      canceled = true
    }
  }, [org.siteId])

  const handleOrgChange = useCallback(({ values }) => {
    const spec = (v) => (v && v !== 'all' && v !== 'none' ? v : null)
    setOrg({ groupId: spec(values?.[0]), siteId: spec(values?.[1]) })
  }, [])

  useEffect(() => {
    if (!hasScope) {
      setItems([])
      return
    }
    let canceled = false
    setLoading(true)
    mapApis
      .searchMaps({ groupId: effectiveGroupId, siteId: org.siteId, page: 1, size: 100 })
      .then((res) => {
        if (!canceled) setItems(res?.items || [])
      })
      .catch((e) => {
        console.error('맵 목록 검색 실패:', e)
        if (!canceled) setItems([])
      })
      .finally(() => {
        if (!canceled) setLoading(false)
      })
    return () => {
      canceled = true
    }
  }, [hasScope, effectiveGroupId, org.siteId])

  const mapsByArea = useMemo(() => {
    const m = {}
    items.forEach((it) => {
      if (it?.mapScope?.areaId) m[it.mapScope.areaId] = it
    })
    return m
  }, [items])

  const robotItems = useMemo(() => items.filter((it) => it?.mapScope?.deviceId), [items])

  const allAreas = useMemo(
    () =>
      buildings.flatMap((b) =>
        (b.floors ?? []).flatMap((f) =>
          (f.areas ?? []).map((a) => ({
            buildingId: b.buildingId,
            buildingName: b.buildingName ?? b.buildingId,
            floorId: f.floorId,
            floorName: f.floorName ?? f.floorId,
            areaId: a.areaId,
            areaName: a.areaName ?? a.areaId
          }))
        )
      ),
    [buildings]
  )

  const buildingOptions = useMemo(
    () => [{ name: t('mapMgmt.allBuildings'), value: '' }, ...buildings.map((b) => ({ name: b.buildingName ?? b.buildingId, value: b.buildingId }))],
    [buildings, t]
  )

  const floorSource = useMemo(
    () => (buildingFilter ? buildings.find((b) => b.buildingId === buildingFilter)?.floors ?? [] : buildings.flatMap((b) => b.floors ?? [])),
    [buildings, buildingFilter]
  )
  const floorOptions = useMemo(
    () => [{ name: t('mapMgmt.allFloors'), value: '' }, ...floorSource.map((f) => ({ name: f.floorName ?? f.floorId, value: f.floorId }))],
    [floorSource, t]
  )

  // 사이트 맵(영역) 행 + 로봇 맵 행 (빌딩/층 필터 미적용 시 로봇 맵도 함께 표시)
  const rows = useMemo(() => {
    const areaRows = allAreas
      .filter((a) => (!buildingFilter || a.buildingId === buildingFilter) && (!floorFilter || a.floorId === floorFilter))
      .map((a) => ({
        _key: `a-${a.areaId}`,
        isRobot: false,
        buildingId: a.buildingId,
        floorId: a.floorId,
        areaId: a.areaId,
        buildingName: a.buildingName,
        floorName: a.floorName,
        areaName: a.areaName,
        robotName: '-',
        mapItem: mapsByArea[a.areaId]
      }))
    const robotRows =
      buildingFilter || floorFilter
        ? []
        : robotItems.map((it) => ({
            _key: `r-${it.mapId}`,
            isRobot: true,
            deviceId: it.mapScope.deviceId,
            buildingName: '-',
            floorName: '-',
            areaName: '-',
            robotName: deviceNames[it.mapScope.deviceId] ?? it.mapScope.deviceId,
            mapItem: it
          }))
    return [...areaRows, ...robotRows]
  }, [allAreas, buildingFilter, floorFilter, mapsByArea, robotItems, deviceNames])

  const handleBuildingChange = (v) => {
    setBuildingFilter(v)
    setFloorFilter('')
  }

  const columns = useMemo(
    () => [
      { name: t('mapMgmt.colType'), cell: (row) => <OwnerBadge isRobot={row.isRobot} t={t} /> },
      { name: t('mapMgmt.colBuilding'), selector: (row) => row.buildingName, cell: (row) => <span style={{ fontSize: '1.3rem', pointerEvents: 'none' }}>{row.buildingName}</span> },
      { name: t('mapMgmt.colFloor'), selector: (row) => row.floorName, cell: (row) => <span style={{ fontSize: '1.3rem', pointerEvents: 'none' }}>{row.floorName}</span> },
      { name: t('mapMgmt.colArea'), selector: (row) => row.areaName, cell: (row) => <span style={{ fontSize: '1.3rem', pointerEvents: 'none' }}>{row.areaName}</span> },
      { name: t('mapMgmt.colRobot'), selector: (row) => row.robotName, cell: (row) => <span style={{ fontSize: '1.3rem', pointerEvents: 'none' }}>{row.robotName}</span> },
      { name: t('mapMgmt.colMap'), cell: (row) => <MapTypeCell mapItem={row.mapItem} t={t} />, grow: 2 }
    ],
    [t]
  )

  // 항목이 2개 이상일 때만 필터 노출 (기본값은 '전체' = '')
  // 층 필터는 빌딩 필터가 보일 때만 노출
  const showBuildingFilter = buildings.length >= 2
  const showFloorFilter = showBuildingFilter && floorSource.length >= 2

  return (
    <StyledPageContent className="column">
      <Title>{t('mapMgmt.listTitle')}</Title>

      {/* 필터 — 사이트 필터 옆에 빌딩/층 필터 배치 (카드 없이) */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '2rem', flexWrap: 'wrap' }}>
        <OrganizationSelector onChange={handleOrgChange} disableCenter />
        {hasScope && showBuildingFilter && (
          <Dropdown size="lg" minWidth="16rem" value={buildingFilter} options={buildingOptions} onChange={handleBuildingChange} />
        )}
        {hasScope && showFloorFilter && (
          <Dropdown size="lg" minWidth="16rem" value={floorFilter} options={floorOptions} onChange={setFloorFilter} />
        )}
      </div>

      {/* 테이블 카드 */}
      <SectionRobot>
        {!hasScope ? (
          <div style={{ padding: '4rem', textAlign: 'center', color: 'var(--color-neutral-50)', fontSize: '1.4rem' }}>
            {t('mapMgmt.selectSiteGuide')}
          </div>
        ) : (
          <Table
            columns={columns}
            data={rows}
            isLoading={loading}
            noData={t('mapMgmt.noMaps')}
            keyField="_key"
            pagination
            paginationRowsPerPageOptions={[10, 30, 50, 100]}
            highlightOnHover
            pointerOnHover
            onRowClicked={(row) => {
              if (row.mapItem) {
                navigate(`/robot/maps/detail?mapId=${row.mapItem.mapId}`)
                return
              }
              // 맵이 없는 영역/로봇 → scope 파라미터로 상세(신규 업로드) 이동
              const p = new URLSearchParams()
              if (effectiveGroupId) p.set('groupId', effectiveGroupId)
              if (org.siteId) p.set('siteId', org.siteId)
              if (row.isRobot) {
                if (row.deviceId) p.set('deviceId', row.deviceId)
              } else {
                if (row.buildingId) p.set('buildingId', row.buildingId)
                if (row.floorId) p.set('floorId', row.floorId)
                if (row.areaId) p.set('areaId', row.areaId)
              }
              navigate(`/robot/maps/detail?${p.toString()}`)
            }}
          />
        )}
      </SectionRobot>
    </StyledPageContent>
  )
}

export default MapManagement
