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
import { isWorkingMapDir, publishedNameOf, resolveMapDir } from '@/utils/mapRecord'

const nameOf = (n) => n?.default ?? n?.['ko-KR'] ?? n?.['en-US'] ?? '-'
const indexById = (arr) => Object.fromEntries((arr ?? []).map((x) => [x.id, x]))

const DownloadTable = () => {
  const [allRows, setAllRows] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [filter, setFilter] = useState({ buildingId: '', floorId: '', areaId: '' })

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

        const activeStie = sitesRes?.data?.find((e) => e.isActive)
        if (!activeStie) {
          setIsLoading(true)
          return
        }
        const sites = indexById([activeStie])
        const buildings = indexById(buildingsRes?.data)
        const floors = indexById(floorsRes?.data)
        const areas = indexById(areasRes?.data)
        const maps = mapsRes?.data ?? []

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
  }, [])

  const handleMapDownload = async (row) => {
    // 선택한 위치(building/floor/area)와 대상 맵 정보를 모달로 보여준다.
    setSelectedRow(row)
    setDownloadModalOpen(true)
  }

  const closeDownlaodModal = () => setDownloadModalOpen(false)

  const handleConfirmDownload = () => {
    // TODO: 선택한 맵(주행맵 + POI) 다운로드 연동
    console.log('confirm download', selectedRow)
    toast.info('다운로드 (미구현)', { autoClose: 2000 })
    setDownloadModalOpen(false)
  }

  const columns = [
    { name: '사이트', selector: (row) => row.site, sortable: 'true' },
    { name: '빌딩', selector: (row) => row.building, sortable: 'true' },
    { name: '층', selector: (row) => row.floor, sortable: 'true' },
    { name: '구역', selector: (row) => row.area, sortable: 'true' },
    {
      name: '다운로드',
      cell: (row) => (
        <Button size="sm" onClick={() => handleMapDownload(row)}>
          다운로드
        </Button>
      )
    }
  ]

  return (
    <Section>
      <StyledUploadPageContent className="column">
        <Title>다운로드</Title>
        <TableCard
          columns={columns}
          data={allRows}
          loading={isLoading}
          noData="다운로드할 맵 정보가 없습니다."
          pagination
          paginationRowsPerPageOptions={[10, 30, 50, 100]}
        />
      </StyledUploadPageContent>

      <Modal
        isOpen={downloadModalOpen}
        title="맵 다운로드"
        onClose={closeDownlaodModal}
        size="md"
        renderButtonComponent={
          <ModalButtons>
            <Button onClick={handleConfirmDownload}>다운로드</Button>
            <Button variant="outline" onClick={closeDownlaodModal}>
              취소
            </Button>
          </ModalButtons>
        }
      >
        {selectedRow && (
          <div style={{ padding: '1rem 0' }}>
            <SummaryHeading>
              {selectedRow.site} / {selectedRow.building} / {selectedRow.floor} / {selectedRow.area}
            </SummaryHeading>
          </div>
        )}
      </Modal>
    </Section>
  )
}

export default DownloadTable
