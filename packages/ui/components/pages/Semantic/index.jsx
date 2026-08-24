import { useState, useEffect } from 'react'
import { Section, Button, Dropdown } from '@repo/ui'
import { CommandBar, CommandButtons, CommandRow, CommandFilters, SemanticWorkspace } from './styles'
import SemanticTable from './SemanticTable'
import SemanticDetail from './SemanticDetail'

const SEMANTIC_TYPES = ['POI', 'ETC']
const OPERATION_TYPES = ['IN-USE', 'WORKING']

/**
 * POI(시맨틱) 편집 화면 본문.
 *
 * 페이지 제목·위치 선택 등 페이지 껍데기는 이 컴포넌트를 쓰는 앱 페이지가 갖는다
 * (init-setup 의 Map/Semantic 은 StyledPageContent > Title / LocationBar / Section 구성).
 * 여기서는 명령 버튼 + (지도 | 목록/상세) 두 열만 렌더한다.
 *
 * @param {React.ReactNode} [mapSlot] 왼쪽 지도 칸에 넣을 내용.
 *   지도 렌더러는 앱마다 달라서(init-setup 은 foxglove 기반 MapCanvas) 주입받는다.
 */
const SemanticPage = ({ poiVersion, poiList, onSave, onCancel, mapSlot }) => {
  const [loading, setLoading] = useState(false)
  const [mode, setMode] = useState('MODE_LIST')
  const [selectedRow, setSeletedRow] = useState(null)
  const [pois, setPois] = useState([])
  const [workingPois, setWorkingPois] = useState([])
  // Table 의 operation 필터(IN-USE/WORKING). SemanticTable 은 상세 진입 시 언마운트되므로
  // 필터가 리셋되지 않도록 여기(부모)에서 들고 있는다.
  const [operationMode, setOperationMode] = useState('IN-USE')
  const [semanticType, setSemanticType] = useState('POI')

  useEffect(() => {
    const inUse = poiList.filter((poi) => !poi.editStatus)
    const working = poiList.filter((poi) => poi.editStatus)

    // poiId 기준으로 IN-USE 에는 있으나 WORKING 에 없는 POI 는 작업본으로 복사한다.
    const workingPoiIds = new Set(working.map((poi) => poi.poiId))
    const copies = inUse
      .filter((poi) => !workingPoiIds.has(poi.poiId))
      .map((poi) => ({ ...poi, editStatus: { inUsed: true } }))
    setPois(inUse)
    setWorkingPois([...working, ...copies])
    setLoading(true)
  }, [poiList])

  const handleSave = () => {
    onSave(workingPois)
  }

  const handleCancel = () => {
    console.log('handleCancel')
    onCancel()
  }

  const handleCreate = () => {
    console.log('onCreate')
    setSeletedRow(null)
    setMode('MODE_DETAIL')
  }

  const handleCreated = (newObj) => {
    console.log('handleCreated newObj', newObj)
    setWorkingPois((prev) => [...prev, newObj])

    setSeletedRow(null)
    setMode('MODE_LIST')
    setOperationMode('WORKING')
  }

  const handlePoiDeleted = (ids) => {
    setWorkingPois((prev) =>
      prev.map((poi) =>
        ids.includes(poi.id)
          ? {
              ...poi,
              editStatus: {
                ...poi.editStatus,
                softDelete: true,
                needToSave: true
              }
            }
          : poi
      )
    )

    setSeletedRow(null)
    setMode('MODE_LIST')
  }

  const handlePoiRestore = (row) => {
    setWorkingPois((prev) =>
      prev.map((poi) =>
        poi.id === row.id
          ? {
              ...poi,
              editStatus: {
                ...poi.editStatus,
                softDelete: false,
                needToSave: true
              }
            }
          : poi
      )
    )
  }

  const handleEdited = (editedObj) => {
    console.log('onEdited')
    setWorkingPois((prev) => prev.map((poi) => (poi.poiId === editedObj.poiId ? editedObj : poi)))
    setSeletedRow(null)
    setMode('MODE_LIST')
    setOperationMode('WORKING')
  }

  const handleNameClick = (row) => {
    setSeletedRow(row)
    // IN-USE 는 읽기 전용 조회, WORKING 은 편집.
    setMode(operationMode === 'IN-USE' ? 'MODE_VIEW' : 'MODE_DETAIL')
  }

  const handlePoiCancel = () => {
    setSeletedRow(null)
    setMode('MODE_LIST')
  }

  return (
    loading && (
      // 페이지 껍데기(StyledPageContent/Title)는 앱 페이지가 갖고, 여기서는 Section 들만 내보낸다
      // — Section 안에 Section 을 겹치면 카드가 이중으로 보인다.
      <>
        {/* Command Button area */}
        <CommandBar>
          <Section>
            <CommandRow>
              <CommandFilters>
                <Dropdown
                  label="type"
                  size="md"
                  value={semanticType}
                  options={SEMANTIC_TYPES.map((tp) => ({ name: tp, value: tp }))}
                  onChange={setSemanticType}
                />
                <Dropdown
                  label="operation"
                  size="md"
                  value={operationMode}
                  options={OPERATION_TYPES.map((op) => ({ name: op, value: op }))}
                  onChange={setOperationMode}
                />
              </CommandFilters>
              {operationMode === 'WORKING' && (
                <CommandButtons>
                  <Button disabled={mode === 'MODE_DETAIL'} size="md" onClick={handleSave}>
                    임시 저장
                  </Button>
                  <Button disabled={mode === 'MODE_DETAIL'} size="md" onClick={handleCancel}>
                    취소
                  </Button>
                </CommandButtons>
              )}
            </CommandRow>
          </Section>
        </CommandBar>

        <SemanticWorkspace className="row">
          {/* Map */}
          <Section>{mapSlot ?? 'Map'}</Section>
          {/* Pannel */}
          <Section>
            {mode === 'MODE_LIST' ? (
              <SemanticTable
                poiVersion={poiVersion}
                data={pois}
                workingData={workingPois}
                operationMode={operationMode}
                onCreate={handleCreate} // create
                onNameClick={handleNameClick} // update
                onPoiDeleted={handlePoiDeleted} // delete
                onPoiRestore={handlePoiRestore} // restore
                onPoiCancel={handlePoiCancel}
              ></SemanticTable>
            ) : (
              <SemanticDetail
                row={selectedRow}
                readOnly={mode === 'MODE_VIEW'}
                onPoiCreated={handleCreated}
                onPoiEdited={handleEdited}
                onPoiCancel={handlePoiCancel}
              ></SemanticDetail>
            )}
          </Section>
        </SemanticWorkspace>
      </>
    )
  )
}

export default SemanticPage
