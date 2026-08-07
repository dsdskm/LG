import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import JSZip from 'jszip'
import { StyledPageContent, Title, SectionRobot as Section, Button, Checkbox } from '@repo/ui'
import { mapApis } from '@/apis'
import { toYmdHmKST } from '@/utils/dateUtils'
import SiteMap3D from '../../common/SiteMap3D'
import '../../index.css'

const TYPE_BADGE = {
  navi: { bg: '#dbeafe', c: '#2563eb' },
  poi: { bg: '#dcfce7', c: '#16a34a' },
  svg: { bg: '#fef3c7', c: '#d97706' }
}

const TypeBadge = ({ type }) => {
  const s = TYPE_BADGE[type] || { bg: 'var(--color-neutral-20)', c: 'var(--color-neutral-60)' }
  return (
    <span
      style={{ padding: '2px 8px', borderRadius: '999px', fontSize: '1.05rem', fontWeight: 700, background: s.bg, color: s.c, whiteSpace: 'nowrap' }}
    >
      {String(type).toUpperCase()}
    </span>
  )
}

const LatestTag = () => (
  <span
    style={{ padding: '2px 8px', borderRadius: '999px', fontSize: '1.05rem', fontWeight: 700, background: 'var(--t-select-accent, #b91c4c)', color: '#fff', whiteSpace: 'nowrap' }}
  >
    LATEST
  </span>
)

// POI 파일(json) → SiteMap3D/SiteMap 오버레이용 pois[]
// 실제 스키마: pois[].pose.position.{x,y}, yaw_deg, name(객체: default/ko-kr/en-us)
const parsePois = (json) => {
  const arr = Array.isArray(json) ? json : json?.pois || json?.poi?.pois || []
  return arr
    .map((p) => {
      const pos = p.pose?.position ?? p.position ?? p
      return {
        poiId: p.poi_id ?? p.poiId ?? p.id,
        name: p.name, // 객체 그대로 (SiteMap이 ko-kr/en-us 대소문자 무시 조회)
        type: p.type,
        x: Number(pos?.x),
        y: Number(pos?.y),
        z: Number(pos?.z ?? 0),
        yawDeg: p.yaw_deg ?? p.yawDeg ?? 0,
        tolerance: p.tolerance,
        properties: p.properties
      }
    })
    .filter((p) => Number.isFinite(p.x) && Number.isFinite(p.y))
}

// PGM(P5/P2) → PNG data URL (map_server trinary 규칙)
const pgmToPngDataUrl = (buf, meta) => {
  const bytes = new Uint8Array(buf)
  let pos = 0
  const isWs = (b) => b === 32 || b === 9 || b === 10 || b === 13
  const readToken = () => {
    while (pos < bytes.length) {
      while (pos < bytes.length && isWs(bytes[pos])) pos++
      if (bytes[pos] === 0x23) {
        while (pos < bytes.length && bytes[pos] !== 0x0a) pos++
        continue
      }
      break
    }
    let s = ''
    while (pos < bytes.length && !isWs(bytes[pos])) {
      s += String.fromCharCode(bytes[pos])
      pos++
    }
    return s
  }
  const magic = readToken()
  const width = parseInt(readToken(), 10)
  const height = parseInt(readToken(), 10)
  const maxval = parseInt(readToken(), 10) || 255
  if (!width || !height) return null

  const values = new Array(width * height)
  if (magic === 'P5') {
    pos++ // maxval 뒤 단일 공백
    for (let i = 0; i < width * height && pos < bytes.length; i++) values[i] = bytes[pos++]
  } else {
    // P2 (ascii)
    for (let i = 0; i < width * height; i++) values[i] = parseInt(readToken(), 10) || 0
  }

  const occ = meta?.occupied_thresh ?? 0.65
  const free = meta?.free_thresh ?? 0.196
  const negate = meta?.negate ? 1 : 0
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')
  const img = ctx.createImageData(width, height)
  for (let i = 0; i < width * height; i++) {
    const pv = values[i] ?? 0
    const p = negate ? pv / maxval : (maxval - pv) / maxval
    const c = p > occ ? 0 : p < free ? 254 : 205
    img.data[i * 4] = c
    img.data[i * 4 + 1] = c
    img.data[i * 4 + 2] = c
    img.data[i * 4 + 3] = 255
  }
  ctx.putImageData(img, 0, 0)
  return canvas.toDataURL('image/png')
}

const previewCard = {
  border: '1px solid var(--color-neutral-20)',
  borderRadius: 'var(--radius-md)',
  padding: '1.2rem',
  background: 'var(--color-neutral-10)'
}
const previewHead = {
  fontSize: '1.3rem',
  fontWeight: 700,
  marginBottom: '0.8rem',
  paddingBottom: '0.6rem',
  borderBottom: '1px solid var(--color-neutral-20)'
}
// 좁은 화면에서 컬럼 정렬을 유지하며 가로 스크롤
const scrollX = { overflowX: 'auto' }
const rowsMin = { minWidth: '60rem' }

const emptyBox = (text) => (
  <div
    style={{ padding: '4rem', textAlign: 'center', color: 'var(--color-neutral-50)', fontSize: '1.4rem', border: '1px dashed var(--color-neutral-30)', borderRadius: 'var(--radius-md)' }}
  >
    {text}
  </div>
)

// 공통 그리드 컬럼: 롤백 | 유형 | 파일명 | 일시 | 상태 | 설명 | 비교
const GRID_COLS = '3.5rem 9.5rem minmax(12rem, 1.3fr) 16rem 7rem minmax(0, 1.6fr) 7rem'
const ellipsis = { overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }

const VersionHeader = ({ t }) => (
  <div
    style={{
      display: 'grid',
      gridTemplateColumns: GRID_COLS,
      gap: '0 1.8rem',
      alignItems: 'center',
      padding: '0.4rem 0',
      fontSize: '1.1rem',
      color: 'var(--color-neutral-50)',
      borderBottom: '1px solid var(--color-neutral-20)'
    }}
  >
    <span>{t('mapMgmt.colRollback')}</span>
    <span>{t('mapMgmt.colType')}</span>
    <span>{t('mapMgmt.fileName')}</span>
    <span>{t('mapMgmt.colDate')}</span>
    <span>{t('mapMgmt.status')}</span>
    <span>{t('mapMgmt.colDesc')}</span>
    <span style={{ textAlign: 'center' }}>{t('mapMgmt.colPreview')}</span>
  </div>
)

const VersionRow = ({ v, checked, onToggle, canCompare, comparing, onCompare }) => (
  <div
    style={{
      display: 'grid',
      gridTemplateColumns: GRID_COLS,
      gap: '0 1.8rem',
      alignItems: 'center',
      padding: '0.8rem 0',
      borderBottom: '1px solid var(--color-neutral-15)',
      fontSize: '1.25rem'
    }}
  >
    <Checkbox checked={checked} onChange={() => onToggle(v.versionId)} />
    <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
      <TypeBadge type={v.mapType} />
      {v.isLatest && <LatestTag />}
    </div>
    <span title={v.filename} style={ellipsis}>
      {v.filename || '-'}
    </span>
    <span style={{ color: 'var(--color-neutral-60)' }}>{v.updatedAt ? toYmdHmKST(v.updatedAt) : '-'}</span>
    <span style={{ color: 'var(--color-neutral-60)' }}>{v.status ?? '-'}</span>
    <span title={v.description || ''} style={{ color: 'var(--color-neutral-50)', ...ellipsis }}>
      {v.description || '-'}
    </span>
    <div style={{ display: 'flex', justifyContent: 'center' }}>
      <Checkbox checked={comparing} disabled={!canCompare} onChange={() => onCompare(v.versionId)} />
    </div>
  </div>
)

const MapHistory = () => {
  const { t } = useTranslation('robot')
  const [searchParams] = useSearchParams()
  const mapId = searchParams.get('mapId')

  const [scope, setScope] = useState(null)
  const [view, setView] = useState(null)
  const [versions, setVersions] = useState([])
  const [loaded, setLoaded] = useState(false)
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState(() => new Set())
  // 비교 대상 — 유형별 각 1개 (NAVI 기본 LATEST). 같은 유형 중복 불가, 다른 유형은 조합 가능
  const [compareSel, setCompareSel] = useState({ navi: null, poi: null, svg: null })
  const [compare, setCompare] = useState(null) // { mapData, mapServer }
  const [compareLoading, setCompareLoading] = useState(false)
  const [rolling, setRolling] = useState(false)
  const objUrlsRef = useRef([]) // 생성한 object URL 모음 (언마운트 시 일괄 정리)

  const load = useCallback(async () => {
    if (!mapId) return
    setLoading(true)
    try {
      const [data, viewData] = await Promise.all([
        mapApis.getMapVersions(mapId),
        mapApis.getMapView(mapId).catch(() => null)
      ])
      setScope(data?.mapScope ?? {})
      setVersions(data?.items ?? [])
      setView(viewData)
      setLoaded(!!data)
    } catch (e) {
      console.error('맵 이력 조회 실패:', e)
      setLoaded(false)
    } finally {
      setLoading(false)
    }
  }, [mapId])

  useEffect(() => {
    load()
  }, [load])

  useEffect(
    () => () => {
      objUrlsRef.current.forEach((u) => URL.revokeObjectURL(u))
      objUrlsRef.current = []
    },
    []
  )

  const naviGroups = useMemo(() => {
    const byUpdatedDesc = (a, b) => new Date(b.updatedAt || 0) - new Date(a.updatedAt || 0)
    const navis = versions.filter((v) => v.mapType === 'navi').sort(byUpdatedDesc)
    return navis.map((navi) => ({
      navi,
      deps: versions
        .filter((v) => (v.mapType === 'poi' || v.mapType === 'svg') && v.baseNaviVersionId === navi.versionId)
        .sort(byUpdatedDesc)
    }))
  }, [versions])

  const orphans = useMemo(
    () => versions.filter((v) => (v.mapType === 'poi' || v.mapType === 'svg') && !v.baseNaviVersionId),
    [versions]
  )

  const latestNaviId = useMemo(() => versions.find((v) => v.mapType === 'navi' && v.isLatest)?.versionId, [versions])

  // 롤백 대상 선택 — 같은 유형은 중복 선택 불가(기존 동일 유형 대체)
  const toggle = useCallback(
    (versionId) => {
      const v = versions.find((x) => x.versionId === versionId)
      setSelected((prev) => {
        const next = new Set(prev)
        if (next.has(versionId)) {
          next.delete(versionId)
        } else {
          for (const id of Array.from(next)) {
            const ex = versions.find((x) => x.versionId === id)
            if (ex?.mapType === v?.mapType) next.delete(id)
          }
          next.add(versionId)
        }
        return next
      })
    },
    [versions]
  )

  // 비교 선택 — 유형별 토글(같은 유형 중복 불가). NAVI는 재클릭 시 LATEST로 복귀
  const onCompare = useCallback(
    (versionId) => {
      const v = versions.find((x) => x.versionId === versionId)
      if (!v) return
      setCompareSel((s) => {
        // NAVI: 기준 토글(재클릭 시 LATEST 복귀). POI/SVG 선택은 유지
        if (v.mapType === 'navi') return { ...s, navi: s.navi === versionId ? latestNaviId ?? null : versionId }
        if (v.mapType === 'poi') return { ...s, poi: s.poi === versionId ? null : versionId }
        if (v.mapType === 'svg') return { ...s, svg: s.svg === versionId ? null : versionId }
        return s
      })
    },
    [versions, latestNaviId]
  )

  // 비교 기준 NAVI 기본값 = LATEST
  useEffect(() => {
    if (latestNaviId) setCompareSel((s) => (s.navi ? s : { ...s, navi: latestNaviId }))
  }, [latestNaviId])

  // 최신 미리보기 (getMapView) — 객체 아이덴티티 안정화(effect 무한 재실행 방지)
  const navi = view?.navi
  const latestMapData = useMemo(
    () =>
      navi?.svgDownloadUrl
        ? { type: 'svg', url: navi.svgDownloadUrl }
        : navi?.pngDownloadUrl
          ? { type: 'png', url: navi.pngDownloadUrl }
          : null,
    [navi]
  )

  // 특정 NAVI 버전의 렌더용 mapData + origin/resolution 구성
  const resolveNaviRender = useCallback(
    async (naviVersionId) => {
    // 최신 NAVI면 서버 렌더(getMapView) 재사용 — NAVI 기본은 grid(png), SVG는 선택 시에만 대체
    if (naviVersionId && naviVersionId === latestNaviId && navi) {
      const mapData = navi.pngDownloadUrl
        ? { type: 'png', url: navi.pngDownloadUrl }
        : navi.svgDownloadUrl
          ? { type: 'svg', url: navi.svgDownloadUrl }
          : null
      // pngDownloadUrl: SVG 선택 시 MULTIGRID 좌표 변환에 필요한 원본 NAVI 래스터 크기 조회용
      return { mapData, navi: { origin: navi.origin, resolution: navi.resolution, pngDownloadUrl: navi.pngDownloadUrl } }
    }
    // 과거 NAVI는 서버 per-version 렌더 API가 없어 zip에서 이미지 추출 (jszip)
    const dl = await mapApis.getVersionDownload(naviVersionId)
    if (!dl?.downloadUrl || !dl?.metadata) return null
    const zipBlob = await (await fetch(dl.downloadUrl)).blob()
    const zip = await JSZip.loadAsync(zipBlob)
    const imageName = dl.metadata.image
    let entry = imageName ? zip.file(imageName) : null
    if (!entry && imageName) {
      const base = String(imageName).split('/').pop().toLowerCase()
      const key = Object.keys(zip.files).find((k) => k.toLowerCase().endsWith(base))
      if (key) entry = zip.file(key)
    }
    if (!entry) return null
    let url
    if (/\.pgm$/i.test(imageName)) {
      const ab = await entry.async('arraybuffer')
      url = pgmToPngDataUrl(ab, dl.metadata)
    } else {
      const ab = await entry.async('arraybuffer')
      const mime = /\.png$/i.test(imageName) ? 'image/png' : /\.jpe?g$/i.test(imageName) ? 'image/jpeg' : 'image/png'
      url = URL.createObjectURL(new Blob([ab], { type: mime }))
      objUrlsRef.current.push(url)
    }
    // 과거 버전은 presigned pngDownloadUrl이 없으므로 zip에서 추출한 원본 이미지(url)를
    // 그대로 재사용 — SVG 선택 시 MULTIGRID 변환의 원본 래스터 크기 조회에 쓰임
    return {
      mapData: { type: 'png', url },
      navi: { origin: dl.metadata.origin, resolution: dl.metadata.resolution, pngDownloadUrl: url }
    }
    },
    [latestNaviId, latestMapData, navi]
  )

  // NAVI는 항상 비교 기준 선택 가능. POI/SVG는 기준 NAVI가 선택돼 있으면 비교 선택 가능(다른 NAVI 것도 허용)
  const canCompareFn = useCallback(
    (v) => v.mapType === 'navi' || (!!compareSel.navi && (v.mapType === 'poi' || v.mapType === 'svg')),
    [compareSel.navi]
  )

  // 비교 대상 미리보기 구성: 기준 NAVI(zip 렌더) + 선택 SVG(이미지 대체) + 선택 POI(오버레이)
  useEffect(() => {
    const { navi: naviId, poi: poiId, svg: svgId } = compareSel
    // 기준 NAVI(기본 LATEST)가 선택되어 있으면 해당 구성으로 미리보기 로딩
    if (!naviId && !poiId && !svgId) {
      setCompare(null)
      return
    }
    let canceled = false
    setCompareLoading(true)
    ;(async () => {
      try {
        const base = naviId ? await resolveNaviRender(naviId) : null
        let mapData = base?.mapData ?? latestMapData ?? null
        const naviMeta = base?.navi ?? (navi ? { origin: navi.origin, resolution: navi.resolution, pngDownloadUrl: navi.pngDownloadUrl } : undefined)
        // SVG 선택 시 베이스 이미지를 SVG로 대체
        if (svgId) {
          const url = await mapApis.getVersionDownloadUrl(svgId)
          if (url) mapData = { type: 'svg', url }
        }
        // POI 선택 시 오버레이
        let pois = []
        if (poiId) {
          const purl = await mapApis.getVersionDownloadUrl(poiId)
          const json = purl ? await (await fetch(purl)).json() : null
          pois = parsePois(json)
        }
        if (!canceled) setCompare(mapData ? { mapData, mapServer: { navi: naviMeta, poi: { pois } } } : null)
      } catch (e) {
        console.error('비교 미리보기 구성 실패:', e)
        if (!canceled) setCompare(null)
      } finally {
        if (!canceled) setCompareLoading(false)
      }
    })()
    return () => {
      canceled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [compareSel, latestNaviId, latestMapData, navi, resolveNaviRender])

  const handleRollback = useCallback(async () => {
    if (!scope || selected.size === 0) return
    const chosen = versions.filter((v) => selected.has(v.versionId))
    if (!chosen.length) return
    if (!window.confirm(t('mapMgmt.rollbackConfirm', { count: chosen.length }))) return

    setRolling(true)
    try {
      for (const v of chosen) {
        const url = await mapApis.getVersionDownloadUrl(v.versionId)
        if (!url) throw new Error(`${v.mapType} 다운로드 URL 없음`)
        const blob = await (await fetch(url)).blob()
        const filename = v.filename || `${v.mapType}`
        const file = new File([blob], filename, { type: blob.type || 'application/octet-stream' })
        const body = {
          mapType: v.mapType,
          filename,
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
        const up = await mapApis.createUploadUrl(body)
        if (!up?.uploadUrl) throw new Error('presigned URL 없음')
        const putRes = await fetch(up.uploadUrl, { method: 'PUT', body: file })
        if (!putRes.ok) throw new Error(`S3 업로드 실패 (${putRes.status})`)
        await mapApis.completeUpload(up.mapId, up.versionId)
      }
      alert(t('mapMgmt.rollbackDone'))
      setSelected(new Set())
      setCompareSel({ navi: latestNaviId ?? null, poi: null, svg: null })
      await load()
    } catch (e) {
      console.error('롤백 실패:', e)
      alert(t('mapMgmt.rollbackFail'))
    } finally {
      setRolling(false)
    }
  }, [scope, selected, versions, load, latestNaviId, t])

  return (
    <StyledPageContent className="column">
      <Title>{t('mapMgmt.historyTitle')}</Title>

      {loading ? (
        <Section>{emptyBox(t('mapMgmt.loadingHistory'))}</Section>
      ) : !loaded ? (
        <Section>{emptyBox(t('mapMgmt.historyNotFound'))}</Section>
      ) : (
        <div className="flex flex-col gap-4">
          {/* 미리보기 비교 (최신 ↔ 선택 이력) */}
          <Section>
            <label className="typographyBody4" style={{ fontWeight: 'bold' }}>
              {t('mapMgmt.previewCompare')}
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1.6rem', marginTop: '1rem' }}>
              <div style={previewCard}>
                <div style={previewHead}>{t('mapMgmt.latest')}</div>
                {latestMapData ? (
                  <SiteMap3D only2D mapData={latestMapData} mapServer={view} robotDatas={[]} height="420px" />
                ) : (
                  emptyBox(t('mapMgmt.noLatestImg'))
                )}
              </div>
              <div style={previewCard}>
                <div style={previewHead}>{t('mapMgmt.selectedHistory')}</div>
                {compareLoading ? (
                  emptyBox(t('mapMgmt.composingPreview'))
                ) : compare?.mapData ? (
                  <SiteMap3D only2D mapData={compare.mapData} mapServer={compare.mapServer} robotDatas={[]} height="420px" />
                ) : (
                  emptyBox(t('mapMgmt.compareGuide'))
                )}
              </div>
            </div>
          </Section>

          {/* 버전 이력 (NAVI별 POI/SVG 종속) */}
          <Section>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.8rem' }}>
              <label className="typographyBody4" style={{ fontWeight: 'bold' }}>
                {t('mapMgmt.versionHistory')}
              </label>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
                <span style={{ fontSize: '1.3rem', color: 'var(--color-neutral-60)' }}>
                  {t('mapMgmt.selectedCount', { count: selected.size })}
                </span>
                <Button theme="primary" size="sm" disabled={selected.size === 0 || rolling} onClick={handleRollback}>
                  {rolling ? t('mapMgmt.rollingBack') : t('mapMgmt.rollbackSelected')}
                </Button>
              </div>
            </div>

            <div style={{ marginTop: '1rem' }}>
              {naviGroups.length === 0 && orphans.length === 0 && emptyBox(t('mapMgmt.noVersions'))}

              {naviGroups.map(({ navi: naviV, deps }) => (
                <div
                  key={naviV.versionId}
                  style={{
                    border: '1px solid var(--color-neutral-20)',
                    borderRadius: 'var(--radius-md)',
                    padding: '1.2rem 1.4rem',
                    marginBottom: '1.2rem',
                    background: 'var(--color-neutral-10)'
                  }}
                >
                  <div style={{ fontSize: '1.3rem', fontWeight: 700, color: 'var(--color-neutral-70)', marginBottom: '0.4rem' }}>
                    {t('mapMgmt.naviGroup', { count: deps.length })}
                  </div>
                  <div style={scrollX}>
                    <div style={rowsMin}>
                      <VersionHeader t={t} />
                      <VersionRow
                        v={naviV}
                        checked={selected.has(naviV.versionId)}
                        onToggle={toggle}
                        canCompare={canCompareFn(naviV)}
                        comparing={compareSel.navi === naviV.versionId}
                        onCompare={onCompare}
                      />
                      {deps.map((d) => (
                        <VersionRow
                          key={d.versionId}
                          v={d}
                          checked={selected.has(d.versionId)}
                          onToggle={toggle}
                          canCompare={canCompareFn(d)}
                          comparing={compareSel[d.mapType] === d.versionId}
                          onCompare={onCompare}
                        />
                      ))}
                    </div>
                  </div>
                </div>
              ))}

              {orphans.length > 0 && (
                <div style={{ border: '1px solid var(--color-neutral-20)', borderRadius: 'var(--radius-md)', padding: '1.2rem 1.4rem' }}>
                  <div style={{ fontSize: '1.3rem', fontWeight: 700, color: 'var(--color-neutral-70)', marginBottom: '0.4rem' }}>
                    {t('mapMgmt.naviOrphan')}
                  </div>
                  <div style={scrollX}>
                    <div style={rowsMin}>
                      <VersionHeader t={t} />
                      {orphans.map((d) => (
                        <VersionRow
                          key={d.versionId}
                          v={d}
                          checked={selected.has(d.versionId)}
                          onToggle={toggle}
                          canCompare={canCompareFn(d)}
                          comparing={compareSel[d.mapType] === d.versionId}
                          onCompare={onCompare}
                        />
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </Section>
        </div>
      )}
    </StyledPageContent>
  )
}

export default MapHistory
