import { useState, useEffect, useMemo, useRef } from 'react'
import { Section, Button, Dropdown } from '@repo/ui'
import { CommandBar, CommandButtons, CommandRow, CommandFilters, DetailPanel, SemanticWorkspace } from './styles'
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
 * @param {React.ReactNode|Function} [mapSlot] 왼쪽 지도 칸에 넣을 내용.
 *   지도 렌더러는 앱마다 달라서(init-setup 은 foxglove 기반 MapCanvas) 주입받는다.
 *   함수로 주면 지금 목록에 보이는 POI 를 넘겨준다 — ({ pois }) => ReactNode.
 *   지도에 POI 를 함께 그리려면 이 형태를 쓴다(작업본의 미저장 POI 까지 반영된다).
 * @param {object|null} [robotPose] 로봇 현재 위치 { x, y, yaw(rad) } — 지도와 같은 프레임.
 *   POI 상세의 '현재 위치로 설정' 버튼이 쓴다. 텔레메트리는 앱이 들고 있으므로 주입받는다.
 * @param {string} [noData] POI 가 하나도 없을 때 목록 자리에 보여줄 문구(앱의 i18n 문자열).
 */
const SemanticPage = ({ poiVersion, poiList, onSave, onCancel, mapSlot, robotPose = null, noData = '' }) => {
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

  // 상세가 지도/목록 아래에 열리므로 화면 밖에 있을 수 있다 — 열릴 때 폼이 보이는 곳까지 스크롤한다.
  const detailRef = useRef(null)
  useEffect(() => {
    if (mode === 'MODE_LIST') return
    detailRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
  }, [mode, selectedRow])

  // 목록(SemanticTable)에 지금 보이는 POI — 지도도 같은 목록을 그린다.
  // IN-USE 는 저장된 POI, WORKING 은 작업본(미저장 생성/수정/삭제 예정 포함)이다.
  const visiblePois = useMemo(
    () => (operationMode === 'IN-USE' ? pois : workingPois),
    [operationMode, pois, workingPois]
  )

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
          {/* Map — 지도와 목록이 같은 POI 를 보도록, 표시 중인 목록(visiblePois)을 그대로 넘긴다 */}
          <Section>{typeof mapSlot === 'function' ? mapSlot({ pois: visiblePois }) : (mapSlot ?? 'Map')}</Section>
          {/* Pannel — 목록은 상세를 여는 동안에도 계속 보여준다(어느 POI 를 고쳤는지 보이도록) */}
          <Section>
            <SemanticTable
              poiVersion={poiVersion}
              data={pois}
              workingData={workingPois}
              operationMode={operationMode}
              noData={noData}
              actionsDisabled={mode !== 'MODE_LIST'}
              onCreate={handleCreate} // create
              onNameClick={handleNameClick} // update
              onPoiDeleted={handlePoiDeleted} // delete
              onPoiRestore={handlePoiRestore} // restore
              onPoiCancel={handlePoiCancel}
            ></SemanticTable>
          </Section>
        </SemanticWorkspace>

        {/* 상세/생성 폼 — 지도·목록 아래에 펼친다.
            key 로 편집 대상이 바뀔 때 다시 마운트한다 — SemanticDetail 은 마운트 시점에만
            row 를 폼으로 옮기므로(useEffect deps []), 목록이 살아 있는 지금은 다른 POI 를
            눌러도 폼이 그대로 남는다. */}
        {mode !== 'MODE_LIST' && (
          <DetailPanel ref={detailRef}>
            <SemanticDetail
              key={selectedRow?.poiId ?? 'new'}
              row={selectedRow}
              readOnly={mode === 'MODE_VIEW'}
              robotPose={robotPose}
              onPoiCreated={handleCreated}
              onPoiEdited={handleEdited}
              onPoiCancel={handlePoiCancel}
            ></SemanticDetail>
          </DetailPanel>
        )}
      </>
    )
  )
}

export default SemanticPage
