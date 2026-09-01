import { useState, useEffect, useMemo } from 'react'
import { Title, TableCard, Button, Section, Dropdown, Modal, Toast } from '@repo/ui'
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
import { useUserStore } from '@repo/stores'

// 다국어 이름 {default, ko-KR, en-US} 에서 표시 문자열을 고른다.
const nameOf = (n) => n?.default ?? n?.['ko-KR'] ?? n?.['en-US'] ?? '-'
// id 로 조회하기 위한 맵.
const indexById = (arr) => Object.fromEntries((arr ?? []).map((x) => [x.id, x]))
// 행에 딸린 맵 이름 표시 — 맵이 없으면 '-'.
const mapNames = (row) => (row.maps ?? []).map((m) => nameOf(m.name)).join(', ') || '-'

const UploadTable = () => {
  const [allRows, setAllRows] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [filter, setFilter] = useState({ buildingId: '', floorId: '', areaId: '' })
  // 승격(맵 업로드) 후 목록을 다시 읽기 위한 트리거 — 맵 이름/경로가 바뀌므로 화면도 갱신해야 한다.
  const [reloadKey, setReloadKey] = useState(0)

  // 업로드 요약 모달
  const [mapUplaodModalOpen, setMapUplaodModalOpen] = useState(false)
  const [selectMapUploadRow, setSelectMapUploadRow] = useState(false)

  const [poiUploadModalOpen, setPoiUploadModalOpen] = useState(false)
  const [poiUplaodLoading, setPoiUplaodLoading] = useState(false)
  const [slectedPoiRow, setSlectedPoiRow] = useState(null)
  const [poiUploadSummary, setPoiUploadSummary] = useState(null) // { created, edited, deleted }

  useEffect(() => {
    let alive = true
    const fetchRows = async () => {
      setIsLoading(true)
      try {
        // 위치 계층: Area.floorId → Floor.buildingId → Building.siteId → Site
        // 맵도 함께 받는다 — 행마다 업로드 대상 맵을 붙여야 하고, 구역에 매이지 않은 맵
        // (건물 정보가 없는 로봇에서 위치 없이 저장한 맵 등)도 목록에 올려야 한다.
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
            siteId: site?.id,
            site: site ? nameOf(site.siteName) : '-',
            siteExtId: site.extId,
            buildingId: floor?.buildingId,
            building: building ? nameOf(building.name) : '-',
            buildingExtId: building.extId,
            buildingName: building.name.default,
            floorId: area.floorId,
            floor: floor ? nameOf(floor.name) : '-',
            floorExitId: floor.extId,
            floorName: floor.name.default,
            areaId: area.id,
            area: nameOf(area.name),
            areaExitId: area.extId,
            areaName: area.name.default,
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

  const handleMapUpload = async (row) => {
    setSelectMapUploadRow(row)
    setMapUplaodModalOpen(true)
  }

  // 맵 업로드 버튼 → 행에 붙은 맵 레코드에서 작업본 디렉터리를 찾아 승격한다.
  // 행이 이미 대상 맵을 들고 있으므로 areaId 로 다시 조회하지 않는다 — 구역 없는 행(areaId=null)은
  // areaId 쿼리가 전체 맵을 돌려줘 엉뚱한 맵을 올리게 된다.
  const handleConfirmMapUpload = async () => {
    console.log('selectMapUploadRow:', selectMapUploadRow)
    const mapRes = await mapApi.list({
      areaId: selectMapUploadRow.areaId,
      status: 'inactive'
    })

    if (mapRes?.total !== 1) {
      console.log('no map to uplaod')
      toast.warn('업로드 가능한 맵이 없습니다.', { autoClose: 3000 })
      return
    }
    // 작업본 디렉터리는 맵 레코드의 경로에서 얻는다 — 저장 폴더 이름이 난수라
    // (init-setup utils/mapRecord.newWorkingMapDirName) 위치 이름으로 경로를 조립할 수 없다.
    const dirs = Array.from(new Set((selectMapUploadRow.maps ?? []).map(resolveMapDir).filter(Boolean)))
    console.log('dirs:', dirs)

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
    const session = useUserStore.getState().session

    const siteScopoeRes = await siteApi.retrieveSiteScope({
      siteId: selectMapUploadRow.siteExtId,
      authorization: session?.accessToken
    })
    console.log('siteScopoeRes :', siteScopoeRes)
    if (!siteScopoeRes.success) {
      toast.error('싸이트 정보 조회 실패', { autoClose: 3000 })
      setMapUplaodModalOpen(false)
      return
    }
    try {
      const resUplaod = await mapApi.uploadMap({
        groupId: siteScopoeRes?.data.groupId,
        siteId: selectMapUploadRow.siteExtId,
        buildingId: selectMapUploadRow.buildingExtId,
        floorId: selectMapUploadRow.floorExitId,
        areaId: selectMapUploadRow.areaExitId,
        mapType: 'navi',
        filename: 'navi_map.zip',
        authorization: session?.accessToken,
        sourceDir: savePath,
        localMapId: mapRes.data[0].id
      })
    } catch (error) {
      toast.error('업로드 실패', { autoClose: 3000 })
      setMapUplaodModalOpen(false)
      return
    }

    Toast.info('맵 업로드 성공', { autoClose: 3000 })
    setMapUplaodModalOpen(false)

    const result = await publishMapDir({ savePath, overwrite: false })
    if (result === 'conflict') {
      setConflict({ selectMapUploadRow, savePath, publishedName: publishedNameOf(savePath) })
    }
  }

  // 업로드 버튼 → 대상 Area 의 맵 POI 를 editStatus 로 분류해 요약 모달을 연다.
  const handleSemanticUpload = async (row) => {
    setSlectedPoiRow(row)
    setPoiUploadSummary(null)
    setPoiUploadModalOpen(true)
    setPoiUplaodLoading(true)
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
      setPoiUploadSummary({ created, edited, deleted, originalsByPoiId, basePoiVersionId })
    } catch (error) {
      console.error('[Upload] 업로드 대상 조회 실패:', error)
      toast.error('업로드 대상을 조회하지 못했습니다.', { autoClose: 3000 })
      setPoiUploadSummary({ created: [], edited: [], deleted: [] })
    } finally {
      setPoiUplaodLoading(false)
    }
  }

  const handleConfirmUpload = async () => {
    if (!poiUploadSummary) return

    const session = useUserStore.getState().session
    const res = await siteApi.retrieveSiteScope({
      siteId: slectedPoiRow.siteExtId,
      authorization: session?.accessToken
    })
    const body = buildApplyPoiBatchBody(poiUploadSummary)
    body.groupId = res?.data.groupId
    body.siteId = slectedPoiRow.siteExtId
    body.buildingId = slectedPoiRow.buildingExtId
    body.floorId = slectedPoiRow.floorExitId
    body.areaId = slectedPoiRow.areaExitId
    body.basePoiVersionId = slectedPoiRow.poiVersion
    body.authorization = session?.accessToken

    console.log('[applyPoiBatch body]', JSON.stringify(body, null, 2))

    const resUplaod = await mapApi.uploadPoi(body)

    toast.info('업로드 요청 body 생성됨 (콘솔 확인) — 실제 전송은 미연동', { autoClose: 2500 })
    setPoiUploadModalOpen(false)
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
        <TableCard
          columns={columns}
          data={allRows}
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
        isOpen={mapUplaodModalOpen}
        title="맵 업로드"
        onClose={() => setMapUplaodModalOpen(false)}
        size="md"
        renderButtonComponent={
          <ModalButtons>
            <Button onClick={handleConfirmMapUpload}>업로드</Button>
            <Button variant="outline" onClick={() => setMapUplaodModalOpen(false)}>
              취소
            </Button>
          </ModalButtons>
        }
      >
        {selectMapUploadRow && (
          <SummaryGroup key={selectMapUploadRow.area}>
            <div className="title">빌딩 : {selectMapUploadRow.building}</div>
            <div className="title">층 : {selectMapUploadRow.floor}</div>
            <div className="title">구역 : {selectMapUploadRow.area}</div>
            <div className="title">싸이트 : {selectMapUploadRow.site}</div>
          </SummaryGroup>
        )}
      </Modal>

      <Modal
        isOpen={poiUploadModalOpen}
        title="POI 업로드"
        onClose={() => setPoiUploadModalOpen(false)}
        size="md"
        renderButtonComponent={
          <ModalButtons>
            <Button
              onClick={handleConfirmUpload}
              disabled={
                poiUplaodLoading ||
                (poiUploadSummary?.created.length === 0 &&
                  poiUploadSummary?.edited.length === 0 &&
                  poiUploadSummary?.deleted.length === 0)
              }
            >
              업로드
            </Button>
            <Button variant="outline" onClick={() => setPoiUploadModalOpen(false)}>
              취소
            </Button>
          </ModalButtons>
        }
      >
        <div style={{ padding: '1rem 0' }}>
          {slectedPoiRow && (
            <SummaryHeading>
              {slectedPoiRow.site} / {slectedPoiRow.building} / {slectedPoiRow.floor} / {slectedPoiRow.area} (
              {mapNames(slectedPoiRow)})
            </SummaryHeading>
          )}

          {poiUplaodLoading || !poiUploadSummary ? (
            <p>확인 중...</p>
          ) : (
            <>
              {[
                { title: '신규 POI 개수', items: poiUploadSummary.created },
                { title: '수정 POI 개수', items: poiUploadSummary.edited },
                { title: '삭제 POI 개수', items: poiUploadSummary.deleted }
              ].map(({ title, items }) => (
                <SummaryGroup key={title}>
                  <div className="title">
                    {title} ({items.length})
                  </div>
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
