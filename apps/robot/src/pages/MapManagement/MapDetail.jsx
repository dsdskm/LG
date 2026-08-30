import React, { useState, useEffect, useCallback, useRef } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { StyledPageContent, Title, SectionRobot as Section, Button, Table } from '@repo/ui'
import { mapApis, groupApis, siteApis, deviceApis } from '@/apis'
import { toYmdHmKST } from '@/utils/dateUtils'
import SiteMap3D from '../../common/SiteMap3D'
import '../../index.css'

const MAP_TYPES = ['navi', 'poi', 'svg']
const ACCEPT = { navi: '.zip', poi: '.json', svg: '.svg' }

const buildNameMap = (res, idKeys, nameKeys) => {
  const list = Array.isArray(res) ? res : res?.content || []
  const map = {}
  list.forEach((o) => {
    const id = idKeys.map((k) => o?.[k]).find(Boolean)
    const name = nameKeys.map((k) => o?.[k]).find(Boolean)
    if (id) map[id] = name || id
  })
  return map
}

const flattenSite = (site) => {
  const building = {}
  const floor = {}
  const area = {}
  ;(site?.buildings ?? []).forEach((b) => {
    if (b.buildingId) building[b.buildingId] = b.buildingName ?? b.buildingId
    ;(b.floors ?? []).forEach((f) => {
      if (f.floorId) floor[f.floorId] = f.floorName ?? f.floorId
      ;(f.areas ?? []).forEach((a) => {
        if (a.areaId) area[a.areaId] = a.areaName ?? a.areaId
      })
    })
  })
  return { building, floor, area }
}

const formatBytes = (n) => {
  if (n == null) return '-'
  if (n < 1024) return `${n} B`
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`
  return `${(n / (1024 * 1024)).toFixed(2)} MB`
}

const emptyBox = (text) => (
  <div
    style={{
      padding: '4rem',
      textAlign: 'center',
      color: 'var(--color-neutral-50)',
      fontSize: '1.4rem',
      border: '1px dashed var(--color-neutral-30)',
      borderRadius: 'var(--radius-md)'
    }}
  >
    {text}
  </div>
)

const fileInfoColumns = [
  {
    name: 'label',
    cell: (row) => <div style={{ fontSize: '14px', color: 'var(--color-neutral-60)' }}>{row.label}</div>
  },
  { name: 'value', cell: (row) => <div style={{ fontSize: '14px', wordBreak: 'break-all' }}>{row.value}</div> }
]

const MapDetail = () => {
  const navigate = useNavigate()
  const { t } = useTranslation('robot')
  const [searchParams] = useSearchParams()
  const mapIdParam = searchParams.get('mapId')
  const qGroupId = searchParams.get('groupId')
  const qSiteId = searchParams.get('siteId')
  const qBuildingId = searchParams.get('buildingId')
  const qFloorId = searchParams.get('floorId')
  const qAreaId = searchParams.get('areaId')
  const qDeviceId = searchParams.get('deviceId')

  const [mapId, setMapId] = useState(mapIdParam)
  const [mapObject, setMapObject] = useState(null)
  const [view, setView] = useState(null)
  const [loading, setLoading] = useState(!!mapIdParam)
  const [userMapApplied, setUserMapApplied] = useState(true)
  const [uploadingType, setUploadingType] = useState(null)
  const [names, setNames] = useState({ group: {}, site: {}, building: {}, floor: {}, area: {}, device: {} })
  const fileInputs = useRef({})

  const load = useCallback(async () => {
    if (!mapId) {
      setLoading(false)
      return
    }
    setLoading(true)
    try {
      const [obj, viewData] = await Promise.all([mapApis.getMap(mapId), mapApis.getMapView(mapId).catch(() => null)])
      setMapObject(obj)
      setView(viewData)
    } catch (e) {
      console.error('맵 상세 조회 실패:', e)
      setMapObject(null)
    } finally {
      setLoading(false)
    }
  }, [mapId])

  useEffect(() => {
    load()
  }, [load])

  // 맵이 없을 때(신규)엔 query scope 사용
  const scope = mapObject?.mapScope || {
    groupId: qGroupId,
    siteId: qSiteId,
    buildingId: qBuildingId,
    floorId: qFloorId,
    areaId: qAreaId,
    deviceId: qDeviceId
  }
  const isRobotMap = !!scope.deviceId
  const isNewMode = !mapId
  const siteIdForNames = scope.siteId

  useEffect(() => {
    let canceled = false
    Promise.allSettled([
      groupApis.getGroups({}),
      siteApis.getSites({}),
      deviceApis.getDevices({ includeTaskFlowState: false })
    ]).then(([g, s, d]) => {
      if (canceled) return
      const val = (r) => (r.status === 'fulfilled' ? r.value : null)
      setNames((prev) => ({
        ...prev,
        group: buildNameMap(val(g), ['groupId', 'id', 'code'], ['groupName', 'name', 'displayName']),
        site: buildNameMap(val(s), ['siteId', 'id', 'code'], ['siteName', 'name', 'displayName']),
        device: buildNameMap(val(d), ['deviceId', 'id'], ['deviceName', 'name'])
      }))
    })
    return () => {
      canceled = true
    }
  }, [])

  useEffect(() => {
    if (!siteIdForNames) return
    let canceled = false
    siteApis
      .getSiteById(siteIdForNames)
      .then((data) => {
        if (!canceled) setNames((prev) => ({ ...prev, ...flattenSite(data) }))
      })
      .catch((e) => console.error('사이트 계층 조회 실패:', e))
    return () => {
      canceled = true
    }
  }, [siteIdForNames])

  const nm = (kind, id) => (id ? names[kind]?.[id] || id : null)

  const navi = view?.navi
  const naviSvg = navi?.svgDownloadUrl ?? null
  const naviPng = navi?.pngDownloadUrl ?? null
  const mapData = userMapApplied
    ? naviSvg
      ? { type: 'svg', url: naviSvg }
      : naviPng
        ? { type: 'png', url: naviPng }
        : null
    : naviPng
      ? { type: 'png', url: naviPng }
      : naviSvg
        ? { type: 'svg', url: naviSvg }
        : null

  const versionsByType = {}
  ;(mapObject?.latestVersions || []).forEach((v) => {
    if (v?.mapType) versionsByType[v.mapType] = v
  })

  const locationText = isRobotMap
    ? t('mapMgmt.robotOnly')
    : [nm('building', scope.buildingId), nm('floor', scope.floorId), nm('area', scope.areaId)]
        .filter((x) => x && x !== '-')
        .join(' | ') || t('mapMgmt.siteBase')

  const infoData = [
    { label: t('mapMgmt.colType'), value: isRobotMap ? t('mapMgmt.robotMap') : t('mapMgmt.siteMap') },
    { label: t('mapMgmt.location'), value: locationText },
    { label: t('mapMgmt.labelGroup'), value: nm('group', scope.groupId) || '-' },
    { label: t('mapMgmt.labelSite'), value: nm('site', scope.siteId) || '-' },
    ...(isRobotMap ? [{ label: t('mapMgmt.colRobot'), value: names.device?.[scope.deviceId] || '-' }] : []),
    ...(mapObject
      ? [
          { label: t('mapMgmt.createdAt'), value: mapObject.createdAt ? toYmdHmKST(mapObject.createdAt) : '-' },
          { label: t('mapMgmt.updatedAt'), value: mapObject.updatedAt ? toYmdHmKST(mapObject.updatedAt) : '-' }
        ]
      : [{ label: t('mapMgmt.status'), value: t('mapMgmt.newNoMap') }])
  ]

  const handleDownload = useCallback(
    async (versionId, filename) => {
      try {
        const url = await mapApis.getVersionDownloadUrl(versionId)
        if (!url) {
          alert(t('mapMgmt.downloadUrlFail'))
          return
        }
        const a = document.createElement('a')
        a.href = url
        a.download = filename || ''
        document.body.appendChild(a)
        a.click()
        a.remove()
      } catch (e) {
        console.error('다운로드 실패:', e)
        alert(t('mapMgmt.downloadFail'))
      }
    },
    [t]
  )

  const handleUpload = useCallback(
    async (mapType, file) => {
      if (!file) return
      const body = {
        mapType,
        filename: file.name,
        ...(scope.deviceId
          ? { deviceId: scope.deviceId }
          : {
              groupId: scope.groupId,
              siteId: scope.siteId,
              ...(scope.buildingId ? { buildingId: scope.buildingId } : {}),
              ...(scope.floorId ? { floorId: scope.floorId } : {}),
              ...(scope.areaId ? { areaId: scope.areaId } : {})
            })
      }
      setUploadingType(mapType)
      try {
        const up = await mapApis.createUploadUrl(body)
        if (!up?.uploadUrl) throw new Error('presigned URL 없음')
        const putRes = await fetch(up.uploadUrl, { method: 'PUT', body: file })
        if (!putRes.ok) throw new Error(`S3 업로드 실패 (${putRes.status})`)
        await mapApis.completeUpload(up.mapId, up.versionId)
        alert(`${mapType.toUpperCase()} ${t('mapMgmt.uploadDone')}`)
        if (up.mapId && up.mapId !== mapId)
          setMapId(up.mapId) // 신규 생성 → 해당 맵 로드
        else await load()
      } catch (e) {
        console.error('업로드 실패:', e)
        alert(`${mapType.toUpperCase()} ${t('mapMgmt.uploadFail')}`)
      } finally {
        setUploadingType(null)
      }
    },
    [scope, mapId, load, t]
  )

  const notFound = mapId && !loading && !mapObject

  const tagName = isRobotMap ? names.device?.[scope.deviceId] : names.site?.[scope.siteId]

  return (
    <StyledPageContent className="column">
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem', marginBottom: '1rem' }}>
        <Title>{t('mapMgmt.detailTitle')}</Title>
        {tagName && (
          <span
            style={{
              padding: '0.4rem 0.8rem',
              borderRadius: '999px',
              fontSize: '1.2rem',
              fontWeight: 600,
              backgroundColor: 'var(--t-tag-bg)',
              color: '#fff',
              whiteSpace: 'nowrap',
              marginBottom: '0.8rem'
            }}
          >
            {tagName}
          </span>
        )}
      </div>

      {loading ? (
        <Section>{emptyBox(t('mapMgmt.loadingMap'))}</Section>
      ) : notFound ? (
        <Section>{emptyBox(t('mapMgmt.mapNotFound'))}</Section>
      ) : (
        <div className="flex flex-col gap-4">
          {/* 기본 정보 — 2열 배치 */}
          <Section>
            <label className="typographyBody4" style={{ fontWeight: 'bold' }}>
              {t('mapMgmt.basicInfo')}
            </label>
            <div
              style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', columnGap: '2.4rem', marginTop: '1rem' }}
            >
              {infoData.map((row) => (
                <div
                  key={row.label}
                  style={{
                    display: 'flex',
                    gap: '1.2rem',
                    fontSize: '1.4rem',
                    padding: '0.8rem 0',
                    borderBottom: '1px solid var(--color-neutral-15)'
                  }}
                >
                  <span style={{ minWidth: '8rem', color: 'var(--color-neutral-60)' }}>{row.label}</span>
                  <span style={{ wordBreak: 'break-all' }}>{row.value}</span>
                </div>
              ))}
            </div>
          </Section>

          {/* NAVI / POI / SVG 파일 — 다운로드 / 업로드 */}
          <Section>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <label className="typographyBody4" style={{ fontWeight: 'bold' }}>
                {t('mapMgmt.mapFiles')}
              </label>
              {mapId && (
                <Button theme="tertiary" size="sm" onClick={() => navigate(`/robot/maps/history?mapId=${mapId}`)}>
                  {t('mapMgmt.manageHistory')}
                </Button>
              )}
            </div>
            <div style={{ display: 'flex', gap: '1.2rem', flexWrap: 'wrap', marginTop: '1rem' }}>
              {MAP_TYPES.map((type) => {
                const v = versionsByType[type]
                const busy = uploadingType === type
                return (
                  <div
                    key={type}
                    style={{
                      flex: '1 1 24rem',
                      minWidth: '24rem',
                      border: '1px solid var(--color-neutral-20)',
                      borderRadius: 'var(--radius-md)',
                      padding: '1.4rem',
                      background: '#F8F8F8'
                    }}
                  >
                    <div style={{ fontWeight: 700, fontSize: '1.4rem', marginBottom: '0.8rem' }}>
                      {type.toUpperCase()}
                    </div>
                    {v ? (
                      <Table
                        className="no-table-head"
                        noTableHead
                        columns={fileInfoColumns}
                        data={[
                          { label: t('mapMgmt.fileName'), value: v.filename },
                          { label: t('mapMgmt.fileSize'), value: formatBytes(v.fileSize) },
                          { label: t('mapMgmt.status'), value: v.status },
                          { label: t('mapMgmt.updatedAt'), value: v.updatedAt ? toYmdHmKST(v.updatedAt) : '-' }
                        ]}
                      />
                    ) : (
                      <span style={{ fontSize: '1.3rem', color: 'var(--color-neutral-50)' }}>
                        {t('mapMgmt.noFile')}
                      </span>
                    )}

                    <div
                      style={{
                        marginTop: '1rem',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.8rem',
                        flexWrap: 'wrap'
                      }}
                    >
                      <Button
                        theme="tertiary"
                        size="sm"
                        disabled={!v}
                        onClick={() => v && handleDownload(v.versionId, v.filename)}
                      >
                        {t('mapMgmt.download')}
                      </Button>
                      <input
                        type="file"
                        accept={ACCEPT[type]}
                        ref={(el) => (fileInputs.current[type] = el)}
                        onChange={(e) => {
                          const file = e.target.files?.[0]
                          e.target.value = ''
                          handleUpload(type, file)
                        }}
                        style={{ display: 'none' }}
                      />
                      <Button
                        theme="tertiary"
                        size="sm"
                        disabled={busy}
                        onClick={() => fileInputs.current[type]?.click()}
                      >
                        {busy ? t('mapMgmt.uploading') : t('mapMgmt.upload')}
                      </Button>
                    </div>
                  </div>
                )
              })}
            </div>
          </Section>

          {/* 2D 맵 (로봇 상세 맵 영역과 동일 방식, 2D 고정) */}
          <Section>
            <label className="typographyBody4" style={{ fontWeight: 'bold' }}>
              {t('mapMgmt.preview')}
            </label>
            <div style={{ marginTop: '1rem' }}>
              {mapData ? (
                <SiteMap3D
                  only2D
                  mapData={mapData}
                  mapServer={view}
                  robotDatas={[]}
                  height="520px"
                  mapApplyControl={{ applied: userMapApplied, onChange: setUserMapApplied }}
                />
              ) : (
                emptyBox(isNewMode ? t('mapMgmt.newUploadHint') : t('mapMgmt.noPreview'))
              )}
            </div>
          </Section>
        </div>
      )}
    </StyledPageContent>
  )
}

export default MapDetail
