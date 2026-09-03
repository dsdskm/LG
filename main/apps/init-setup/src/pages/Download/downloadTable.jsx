import { useState, useEffect } from 'react'
import { Title, TableCard, Button, Section, Modal } from '@repo/ui'
import { toast } from 'react-toastify'
import { useTranslation } from 'react-i18next'
import { StyledUploadPageContent, SummaryHeading, ModalButtons } from './styles'

import * as siteApi from '@/apis/siteApis'
import * as buildingApi from '@/apis/buildingApis'
import * as floorApi from '@/apis/floorApis'
import * as areaApi from '@/apis/areaApis'
import * as mapApi from '@/apis/mapApis'

const nameOf = (n) => n?.default ?? n?.['ko-KR'] ?? n?.['en-US'] ?? '-'
const indexById = (arr) => Object.fromEntries((arr ?? []).map((x) => [x.id, x]))

const DownloadTable = () => {
  // transfer 네임스페이스는 업로드/다운로드 두 화면이 공유한다(locales/*/transfer.json).
  const { t } = useTranslation('transfer')
  const [allRows, setAllRows] = useState([])
  const [isLoading, setIsLoading] = useState(true)

  const [downloadModalOpen, setDownloadModalOpen] = useState(false)
  const [selectedRow, setSelectedRow] = useState(null)

  useEffect(() => {
    let alive = true
    const fetchRows = async () => {
      setIsLoading(true)
      try {
        const [sitesRes, buildingsRes, floorsRes, areasRes, mapsRes] = await Promise.all([
          siteApi.list(),
          buildingApi.list(),
          floorApi.list(),
          areaApi.list(),
          mapApi.list()
        ])
        if (!alive) return

        // 활성 사이트가 없으면 어느 사이트의 맵을 보여줄지 정할 수 없다 — 빈 목록으로 끝낸다
        // (로딩 표시는 finally 에서 내려간다).
        const activeStie = sitesRes?.data?.find((e) => e.isActive)
        if (!activeStie) return
        const sites = indexById([activeStie])
        const buildings = indexById(buildingsRes?.data.filter((e) => e.siteId === activeStie?.id))

        let floorsResList = []
        for (const buildingId of Object.keys(buildings)) {
          const matchRes = floorsRes?.data.filter((el) => el.buildingId === Number(buildingId))
          floorsResList = floorsResList.concat(matchRes)
        }
        const floors = indexById(floorsResList)

        let areaResList = []
        for (const floorId of Object.keys(floors)) {
          const matchRes = areasRes?.data.filter((e) => e.floorId === Number(floorId))
          areaResList = areaResList.concat(matchRes)
        }
        const areas = indexById(areaResList)

        const maps = mapsRes?.data ?? []
        const mapsByArea = maps.reduce((acc, map) => {
          if (map.areaId == null) return acc
          ;(acc[map.areaId] ??= []).push(map)
          return acc
        }, {})

        const areaRows = Object.keys(areas).map((areaId) => {
          const area = areas[areaId]
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
        const orphanRows = []
        // const orphanRows = maps
        //   .filter((map) => map.areaId == null || !areas[map.areaId])
        //   .map((map) => {
        //     const site = map.siteId != null ? sites[map.siteId] : null
        //     return {
        //       id: `map-${map.id}`,
        //       site: site ? nameOf(site.siteName) : '-',
        //       buildingId: undefined,
        //       building: '-',
        //       floorId: undefined,
        //       floor: '-',
        //       areaId: null,
        //       area: '-',
        //       maps: [map]
        //     }
        //   })
        setAllRows([...areaRows, ...orphanRows])
      } catch (error) {
        console.error('[Download] 위치/맵 정보 조회 실패:', error)
        if (alive) {
          setAllRows([])
          toast.error(t('common.loadFailed'), { autoClose: 3000 })
        }
      } finally {
        if (alive) setIsLoading(false)
      }
    }
    fetchRows()
    return () => {
      alive = false
    }
  }, [t])

  const handleMapDownload = async (row) => {
    // 선택한 위치(building/floor/area)와 대상 맵 정보를 모달로 보여준다.
    setSelectedRow(row)
    setDownloadModalOpen(true)
  }

  const closeDownlaodModal = () => setDownloadModalOpen(false)

  const handleConfirmDownload = () => {
    // TODO: 선택한 맵(주행맵 + POI) 다운로드 연동
    toast.info(t('download.notImplemented'), { autoClose: 2000 })
    setDownloadModalOpen(false)
  }

  const columns = [
    // { name: t('common.site'), selector: (row) => row.site, sortable: 'true' },
    { name: t('common.building'), selector: (row) => row.building, sortable: 'true' },
    { name: t('common.floor'), selector: (row) => row.floor, sortable: 'true' },
    { name: t('common.area'), selector: (row) => row.area, sortable: 'true' },
    {
      name: t('download.column'),
      cell: (row) => (
        <Button size="sm" onClick={() => handleMapDownload(row)}>
          {t('download.action')}
        </Button>
      )
    }
  ]

  return (
    <Section>
      <StyledUploadPageContent className="column">
        <Title>{t('download.title')}</Title>
        <TableCard
          columns={columns}
          data={allRows}
          // 로딩 prop 이름은 isLoading 이다(TableCard/Table) — loading 으로 주면 무시된다.
          isLoading={isLoading}
          noData={t('download.noData')}
          pagination
          paginationRowsPerPageOptions={[10, 30, 50, 100]}
        />
      </StyledUploadPageContent>

      <Modal
        isOpen={downloadModalOpen}
        title={t('download.modalTitle')}
        onClose={closeDownlaodModal}
        size="md"
        renderButtonComponent={
          <ModalButtons>
            <Button onClick={handleConfirmDownload}>{t('download.confirm')}</Button>
            {/* Button 은 variant 를 받지 않는다 — 보조 버튼은 theme 로 지정한다. */}
            <Button theme="secondary" onClick={closeDownlaodModal}>
              {t('common.cancel')}
            </Button>
          </ModalButtons>
        }
      >
        {selectedRow && (
          <div style={{ padding: '1rem 0' }}>
            <SummaryHeading>
              {selectedRow.building} / {selectedRow.floor} / {selectedRow.area}
            </SummaryHeading>
          </div>
        )}
      </Modal>
    </Section>
  )
}

export default DownloadTable
