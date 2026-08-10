import { useState, useEffect } from 'react'
import { Section, Button } from '@repo/ui'
import { ButtonWrapper, SemanticWorkspace } from './styles'
import SemanticTable from './SemanticTable'
import SemanticDetail from './SemanticDetail'

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
const SemanticPage = ({ poiList, onSave, onCancel, mapSlot }) => {
  const [loading, setLoading] = useState(false)
  const [mode, setMode] = useState('MODE_LIST')
  const [selectedRow, setSeletedRow] = useState(null)
  const [pois, setPois] = useState([])

  useEffect(() => {
    const newPois = poiList.map((poi) => ({
      ...poi,
      _work: {
        saved: true
      }
    }))
    setPois(newPois)
    setLoading(true)
  }, [poiList])

  const handleSave = () => {
    console.log(pois)
    onSave(pois)
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
    console.log('onCreated')
    setPois((prev) => [...prev, newObj])

    setSeletedRow(null)
    setMode('MODE_LIST')
  }

  const handlePoiDeleted = (ids) => {
    setPois((prev) =>
      prev.map((poi) =>
        ids.includes(poi.id)
          ? {
              ...poi,
              _work: {
                ...poi._work,
                softDelete: true
              }
            }
          : poi
      )
    )

    setSeletedRow(null)
    setMode('MODE_LIST')
  }

  const handlePoiRestore = (row) => {
    setPois((prev) =>
      prev.map((poi) =>
        poi.id === row.id
          ? {
              ...poi,
              _work: {
                ...poi._work,
                softDelete: false
              }
            }
          : poi
      )
    )
  }

  const handleEdited = (editedObj) => {
    console.log('onEdited')
    setPois((prev) => prev.map((poi) => (poi.id === editedObj.id ? editedObj : poi)))
    setSeletedRow(null)
    setMode('MODE_LIST')
  }

  const handleNameClick = (row) => {
    console.log('onNameClick :', row.id)
    if (row._work.state === 'DELETED') {
    } else {
      setSeletedRow(row)
      setMode('MODE_DETAIL')
    }
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
        <Section>
          <ButtonWrapper>
            <Button disabled={mode === 'MODE_DETAIL'} size="md" onClick={handleSave}>
              저장
            </Button>
            <Button disabled={mode === 'MODE_DETAIL'} size="md" onClick={handleCancel}>
              취소
            </Button>
          </ButtonWrapper>
        </Section>

        <SemanticWorkspace className="row">
          {/* Map */}
          <Section>{mapSlot ?? 'Map'}</Section>
          {/* Pannel */}
          <Section>
            {mode === 'MODE_LIST' ? (
              <SemanticTable
                data={pois}
                onCreate={handleCreate} // create
                onNameClick={handleNameClick} // update
                onPoiDeleted={handlePoiDeleted} // delete
                onPoiRestore={handlePoiRestore} // restore
                onPoiCancel={handlePoiCancel}
              ></SemanticTable>
            ) : (
              <SemanticDetail
                row={selectedRow}
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
