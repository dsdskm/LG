import { useState, useEffect, useMemo } from 'react'
import { Title, TableCard, Button, Section, Dropdown, Modal } from '@repo/ui'
import { toast } from 'react-toastify'
import { StyledUploadPageContent, FilterRow, SummaryHeading, SummaryGroup, IdList, ModalButtons } from './styles'

import * as siteApi from '@/apis/siteApis'
import * as buildingApi from '@/apis/buildingApis'
import * as floorApi from '@/apis/floorApis'
import * as areaApi from '@/apis/areaApis'
import * as mapApi from '@/apis/mapApis'
import * as poiApi from '@/apis/mapPoiApis'
import { buildApplyPoiBatchBody } from '@/utils/poiBatch'
import { isWorkingMapDir, publishedNameOf, resolveMapDir, visibleMaps } from '@/utils/mapRecord'

// 다국어 이름 {default, ko-KR, en-US} 에서 표시 문자열을 고른다.
const nameOf = (n) => n?.default ?? n?.['ko-KR'] ?? n?.['en-US'] ?? '-'
// id 로 조회하기 위한 맵.
const indexById = (arr) => Object.fromEntries((arr ?? []).map((x) => [x.id, x]))

const ALL = { name: '전체', value: '' }

// rows 에서 (id, name) 고유 옵션 목록을 만든다(id 없는 행 제외, 앞에 '전체').
const toOptions = (rows, idKey, nameKey) => {
  const seen = new Map()
  rows.forEach((r) => {
    const id = r[idKey]
    if (id == null) return
    if (!seen.has(id)) seen.set(id, r[nameKey])
  })
  return [ALL, ...Array.from(seen, ([value, name]) => ({ value, name }))]
}

// POI 표시 라벨 — poiId 우선, 없으면 DB id.
const poiLabel = (p) => p.poiId ?? `#${p.id}`

// 행에 딸린 맵 이름 표시 — 맵이 없으면 '-'.
const mapNames = (row) => (row.maps ?? []).map((m) => nameOf(m.name)).join(', ') || '-'

const UploadTable = () => {
  const [allRows, setAllRows] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [filter, setFilter] = useState({ buildingId: '', floorId: '', areaId: '' })
  // 승격(맵 업로드) 후 목록을 다시 읽기 위한 트리거 — 맵 이름/경로가 바뀌므로 화면도 갱신해야 한다.
  const [reloadKey, setReloadKey] = useState(0)

  // 업로드 요약 모달
  const [summaryOpen, setSummaryOpen] = useState(false)
  const [summaryLoading, setSummaryLoading] = useState(false)
  const [summaryRow, setSummaryRow] = useState(null)
  const [summary, setSummary] = useState(null) // { created, edited, deleted }

  useEffect(() => {
    let alive = true
    const fetchRows = async () => {
      setIsLoading(true)
      try {
        // 위치 계층: Area.floorId → Floor.buildingId → Building.siteId → Site
        // 맵도 함께 받는다 — 행마다 업로드 대상 맵을 붙여야 하고, 구역에 매이지 않은 맵
        // (건물 정보가 없는 로봇의 Default_working 등)도 목록에 올려야 한다.
        const [sitesRes, buildingsRes, floorsRes, areasRes, mapsRes] = await Promise.all([
          siteApi.list(),
          buildingApi.list(),
          floorApi.list(),
          areaApi.list(),
          mapApi.list()
        ])
        if (!alive) return
        const activeStie = sitesRes?.data?.find((e) => e.isActive)
        if (!activeStie) {
          setIsLoading(true)
          return
        }
        const sites = indexById([activeStie])

        const buildings = indexById(buildingsRes?.data)
        const floors = indexById(floorsRes?.data)
        const areas = indexById(areasRes?.data)
        // archived(업로드로 대체된 이전 맵)는 업로드 대상이 아니므로 목록에서 뺀다.
        const maps = visibleMaps(mapsRes?.data)

        const mapsByArea = maps.reduce((acc, map) => {
          if (map.areaId == null) return acc
          ;(acc[map.areaId] ??= []).push(map)
          return acc
        }, {})

        const areaRows = (areasRes?.data ?? []).map((area) => {
          const floor = floors[area.floorId]
          const building = floor && buildings[floor.buildingId]
          const site = building && sites[building.siteId]
          return {
            id: `area-${area.id}`,
            site: site ? nameOf(site.siteName) : '-',
            buildingId: floor?.buildingId,
            building: building ? nameOf(building.name) : '-',
            floorId: area.floorId,
            floor: floor ? nameOf(floor.name) : '-',
            areaId: area.id,
            area: nameOf(area.name),
            maps: mapsByArea[area.id] ?? []
          }
        })

        // 구역에 매이지 않은 맵 — areaId 가 없거나(위치 계층 없이 저장) 가리키는 구역이 사라진 경우.
        // 이 맵들은 구역 행이 없어 지금까지 화면에서 아예 보이지 않았다.
        const orphanRows = maps
          .filter((map) => map.areaId == null || !areas[map.areaId])
          .map((map) => {
            const site = map.siteId != null ? sites[map.siteId] : null
            return {
              id: `map-${map.id}`,
              site: site ? nameOf(site.siteName) : '-',
              buildingId: undefined,
              building: '-',
              floorId: undefined,
              floor: '-',
              areaId: null,
              area: '-',
              maps: [map]
            }
          })

        setAllRows([...areaRows, ...orphanRows])
      } catch (error) {
        console.error('[Upload] 위치/맵 정보 조회 실패:', error)
        if (alive) {
          setAllRows([])
          toast.error('위치·맵 정보를 불러오지 못했습니다.', { autoClose: 3000 })
        }
      } finally {
        if (alive) setIsLoading(false)
      }
    }
    fetchRows()
    return () => {
      alive = false
    }
  }, [reloadKey])

  // 계층 연동 옵션: 층은 선택 빌딩으로, 구역은 선택 빌딩+층으로 좁힌다.
  const buildingOptions = useMemo(() => toOptions(allRows, 'buildingId', 'building'), [allRows])
  const floorOptions = useMemo(() => {
    const scoped = allRows.filter((r) => !filter.buildingId || r.buildingId === filter.buildingId)
    return toOptions(scoped, 'floorId', 'floor')
  }, [allRows, filter.buildingId])
  const areaOptions = useMemo(() => {
    const scoped = allRows.filter(
      (r) =>
        (!filter.buildingId || r.buildingId === filter.buildingId) && (!filter.floorId || r.floorId === filter.floorId)
    )
    return toOptions(scoped, 'areaId', 'area')
  }, [allRows, filter.buildingId, filter.floorId])

  const filteredRows = useMemo(
    () =>
      allRows.filter(
        (r) =>
          (!filter.buildingId || r.buildingId === filter.buildingId) &&
          (!filter.floorId || r.floorId === filter.floorId) &&
          (!filter.areaId || r.areaId === filter.areaId)
      ),
    [allRows, filter]
  )

  // 상위 선택이 바뀌면 하위 선택은 초기화한다(LocationBar 규약).
  const handleBuildingChange = (v) => setFilter({ buildingId: v, floorId: '', areaId: '' })
  const handleFloorChange = (v) => setFilter((p) => ({ ...p, floorId: v, areaId: '' }))
  const handleAreaChange = (v) => setFilter((p) => ({ ...p, areaId: v }))

  // 맵 업로드(작업본 → 확정본 승격) 상태. conflict 는 확정본이 이미 있어 교체 확인이 필요한 경우다.
  const [publishing, setPublishing] = useState(false)
  const [conflict, setConflict] = useState(null) // { row, savePath, publishedName }

  /**
   * 작업본 맵 디렉터리를 확정본으로 승격한다 (POST /robot-hub/save-map/publish).
   *
   * 승격 후 로봇의 정위 맵 경로는 여기서 바꾸지 않는다 — 초기 위치 없이 switch-mode 를 다시 부르면
   * GKR 360° 재정위가 돌아 현재 추정 위치를 잃는다. 정위 전환은 맵 화면에서 사용자가 한다.
   */
  const publishMapDir = async ({ savePath, overwrite = false }) => {
    setPublishing(true)
    try {
      const res = await mapApi.publishMap({ savePath, overwrite })
      const published = res?.data
      toast.success(`맵 업로드 완료: ${published?.name ?? savePath}`, { autoClose: 3000 })
      setConflict(null)
      // 레코드의 경로/이름이 확정본으로 바뀌었다 — 목록을 다시 읽어야 '이미 업로드됨' 판정이 맞는다.
      setReloadKey((key) => key + 1)
      return true
    } catch (error) {
      const status = error?.response?.status
      const detail = error?.response?.data?.message ?? error?.response?.data?.error
      if (status === 409 && !overwrite) return 'conflict'
      if (status === 409) {
        // overwrite 로도 409 면 격자맵 저장이 아직 안 끝난 경우다(BE 가 미완료 승격을 막는다).
        toast.error('맵 저장이 아직 끝나지 않았습니다. 잠시 후 다시 시도해 주세요.', { autoClose: 4000 })
      } else if (status === 404) {
        toast.error('작업본 맵 폴더를 찾을 수 없습니다. 맵을 다시 저장해 주세요.', { autoClose: 4000 })
      } else if (status === 422) {
        toast.error('로봇의 맵 폴더에 쓸 수 없습니다(마운트 권한 확인 필요).', { autoClose: 4000 })
      } else {
        console.error('[Upload] 맵 승격 실패:', error)
        toast.error(`맵 업로드 실패: ${detail ?? error.message}`, { autoClose: 4000 })
      }
      return false
    } finally {
      setPublishing(false)
    }
  }

  // 맵 업로드 버튼 → 행에 붙은 맵 레코드에서 작업본 디렉터리를 찾아 승격한다.
  // 행이 이미 대상 맵을 들고 있으므로 areaId 로 다시 조회하지 않는다 — 구역 없는 행(areaId=null)은
  // areaId 쿼리가 전체 맵을 돌려줘 엉뚱한 맵을 올리게 된다.
  const handleMapUpload = async (row) => {
    const dirs = Array.from(new Set((row.maps ?? []).map(resolveMapDir).filter(Boolean)))

    if (!dirs.length) {
      toast.warn('이 항목에 등록된 맵이 없습니다. 맵 스캔 후 저장해 주세요.', { autoClose: 3000 })
      return
    }
    const working = dirs.filter(isWorkingMapDir)
    if (!working.length) {
      toast.info('이미 업로드된 맵입니다.', { autoClose: 3000 })
      return
    }
    // 작업본이 여러 개면 어느 것을 확정할지 판단할 근거가 없다 — 임의로 고르지 않는다.
    if (working.length > 1) {
      toast.error(`작업본 맵이 ${working.length}개 있습니다. 불필요한 맵을 먼저 정리해 주세요.`, {
        autoClose: 5000
      })
      return
    }

    const savePath = working[0]
    const result = await publishMapDir({ savePath, overwrite: false })
    if (result === 'conflict') {
      setConflict({ row, savePath, publishedName: publishedNameOf(savePath) })
    }
  }

  // 업로드 버튼 → 대상 Area 의 맵 POI 를 editStatus 로 분류해 요약 모달을 연다.
  const handleSemanticUpload = async (row) => {
    setSummaryRow(row)
    setSummary(null)
    setSummaryOpen(true)
    setSummaryLoading(true)
    try {
      // 행이 들고 있는 맵만 대상으로 한다(areaId 재조회 금지 — 위 handleMapUpload 주석 참고).
      const maps = row.maps ?? []
      const poiLists = await Promise.all(maps.map((m) => poiApi.list({ mapId: m.id })))
      const pois = poiLists.flatMap((r) => r?.data ?? [])
      const created = pois.filter((p) => p.editStatus?.created && !p.editStatus?.softDelete)
      const edited = pois.filter((p) => p.editStatus?.edited && !p.editStatus?.created && !p.editStatus?.softDelete)
      const deleted = pois.filter((p) => p.editStatus?.softDelete)
      // 수정 diff 및 basePoiVersionId 구성용 — 원본(editStatus 없는 POI)과 맵 버전을 함께 담는다.
      const originalsByPoiId = Object.fromEntries(pois.filter((p) => !p.editStatus).map((p) => [p.poiId, p]))
      const basePoiVersionId = maps[0]?.poiVersion ?? null
      setSummary({ created, edited, deleted, originalsByPoiId, basePoiVersionId })
    } catch (error) {
      console.error('[Upload] 업로드 대상 조회 실패:', error)
      toast.error('업로드 대상을 조회하지 못했습니다.', { autoClose: 3000 })
      setSummary({ created: [], edited: [], deleted: [] })
    } finally {
      setSummaryLoading(false)
    }
  }

  const closeSummary = () => setSummaryOpen(false)

  const handleConfirmUpload = () => {
    if (!summary) return
    // 관제 applyPoiBatch 요청 body 생성(현재는 콘솔 출력까지).
    // TODO(user): POST 관제 applyPoiBatch (X-API-Key 인증, 엔드포인트) 연동 + 주행맵 업로드
    const body = buildApplyPoiBatchBody(summary)
    console.log('[applyPoiBatch body]', JSON.stringify(body, null, 2))
    toast.info('업로드 요청 body 생성됨 (콘솔 확인) — 실제 전송은 미연동', { autoClose: 2500 })
    setSummaryOpen(false)
  }

  const columns = [
    { name: '사이트', selector: (row) => row.site, sortable: 'true' },
    { name: '빌딩', selector: (row) => row.building, sortable: 'true' },
    { name: '층', selector: (row) => row.floor, sortable: 'true' },
    { name: '구역', selector: (row) => row.area, sortable: 'true' },
    { name: '맵', selector: (row) => mapNames(row), sortable: 'true' },
    {
      name: '맵 업로드',
      cell: (row) => (
        <Button size="sm" onClick={() => handleMapUpload(row)} disabled={publishing}>
          업로드
        </Button>
      )
    },
    {
      name: '시멘틱 업로드',
      cell: (row) => (
        <Button size="sm" onClick={() => handleSemanticUpload(row)}>
          업로드
        </Button>
      )
    }
  ]

  return (
    <Section>
      <StyledUploadPageContent className="column">
        <Title>업로드</Title>
        {/* <FilterRow>
          <Dropdown label="빌딩" size="md" value={filter.buildingId} options={buildingOptions} onChange={handleBuildingChange} />
          <Dropdown label="층" size="md" value={filter.floorId} options={floorOptions} onChange={handleFloorChange} />
          <Dropdown label="구역" size="md" value={filter.areaId} options={areaOptions} onChange={handleAreaChange} />
        </FilterRow> */}
        <TableCard
          columns={columns}
          data={filteredRows}
          loading={isLoading}
          noData="업로드할 위치·맵 정보가 없습니다."
          pagination
          paginationRowsPerPageOptions={[10, 30, 50, 100]}
        />
      </StyledUploadPageContent>

      <Modal
        isOpen={!!conflict}
        title="맵 교체 확인"
        onClose={() => setConflict(null)}
        size="sm"
        renderButtonComponent={
          <ModalButtons>
            <Button
              onClick={() => publishMapDir({ savePath: conflict.savePath, overwrite: true })}
              disabled={publishing}
            >
              교체
            </Button>
            <Button variant="outline" onClick={() => setConflict(null)} disabled={publishing}>
              취소
            </Button>
          </ModalButtons>
        }
      >
        <div style={{ padding: '1rem 0' }}>
          {conflict && (
            <>
              <SummaryHeading>
                {conflict.row.building} / {conflict.row.floor} / {conflict.row.area}
              </SummaryHeading>
              <p>&lsquo;{conflict.publishedName}&rsquo; 맵이 이미 업로드되어 있습니다. 이번 작업본으로 교체할까요?</p>
              <p>기존 맵은 삭제하지 않고 백업(.bak)으로 남습니다.</p>
            </>
          )}
        </div>
      </Modal>

      <Modal
        isOpen={summaryOpen}
        title="업로드 요약"
        onClose={closeSummary}
        size="md"
        renderButtonComponent={
          <ModalButtons>
            <Button onClick={handleConfirmUpload} disabled={summaryLoading}>
              확인
            </Button>
            <Button variant="outline" onClick={closeSummary}>
              취소
            </Button>
          </ModalButtons>
        }
      >
        <div style={{ padding: '1rem 0' }}>
          {summaryRow && (
            <SummaryHeading>
              {summaryRow.site} / {summaryRow.building} / {summaryRow.floor} / {summaryRow.area} ({mapNames(summaryRow)}
              )
            </SummaryHeading>
          )}
          {summaryLoading || !summary ? (
            <p>확인 중...</p>
          ) : (
            <>
              {[
                { title: '신규 POI 개수', items: summary.created },
                { title: '수정 POI 개수', items: summary.edited },
                { title: '삭제 POI 개수', items: summary.deleted }
              ].map(({ title, items }) => (
                <SummaryGroup key={title}>
                  <div className="title">
                    {title} ({items.length})
                  </div>
                  {/* <IdList>
                    {items.length ? (
                      items.map((p) => <li key={p.id}>{poiLabel(p)}</li>)
                    ) : (
                      <li className="empty">없음</li>
                    )}
                  </IdList> */}
                </SummaryGroup>
              ))}
            </>
          )}
        </div>
      </Modal>
    </Section>
  )
}

export default UploadTable
