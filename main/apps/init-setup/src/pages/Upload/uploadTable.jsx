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

const UploadTable = () => {
  const [allRows, setAllRows] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [filter, setFilter] = useState({ buildingId: '', floorId: '', areaId: '' })

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
        const [sitesRes, buildingsRes, floorsRes, areasRes] = await Promise.all([
          siteApi.list(),
          buildingApi.list(),
          floorApi.list(),
          areaApi.list()
        ])
        if (!alive) return
        const sites = indexById(sitesRes?.data)
        const buildings = indexById(buildingsRes?.data)
        const floors = indexById(floorsRes?.data)
        const nextRows = (areasRes?.data ?? []).map((area) => {
          const floor = floors[area.floorId]
          const building = floor && buildings[floor.buildingId]
          const site = building && sites[building.siteId]
          return {
            id: area.id,
            site: site ? nameOf(site.siteName) : '-',
            buildingId: floor?.buildingId,
            building: building ? nameOf(building.name) : '-',
            floorId: area.floorId,
            floor: floor ? nameOf(floor.name) : '-',
            areaId: area.id,
            area: nameOf(area.name)
          }
        })
        setAllRows(nextRows)
      } catch (error) {
        console.error('[Upload] 위치 정보 조회 실패:', error)
        if (alive) {
          setAllRows([])
          toast.error('위치 정보를 불러오지 못했습니다.', { autoClose: 3000 })
        }
      } finally {
        if (alive) setIsLoading(false)
      }
    }
    fetchRows()
    return () => {
      alive = false
    }
  }, [])

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

  // 업로드 버튼 → 대상 Area 의 맵 POI 를 editStatus 로 분류해 요약 모달을 연다.
  const handleSemanticUpload = async (row) => {
    setSummaryRow(row)
    setSummary(null)
    setSummaryOpen(true)
    setSummaryLoading(true)
    try {
      const maps = (await mapApi.list({ areaId: row.areaId }))?.data ?? []
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
    {
      name: '맵 업로드',
      cell: (row) => (
        <Button size="sm" onClick={() => handleMapUpload(row)}>
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
          noData="위치 정보가 없습니다."
          pagination
          paginationRowsPerPageOptions={[10, 30, 50, 100]}
        />
      </StyledUploadPageContent>

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
              {summaryRow.site} / {summaryRow.building} / {summaryRow.floor} / {summaryRow.area}
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
