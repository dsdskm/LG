import { useState, useEffect, useCallback, useMemo } from 'react'
import { StyledPageContent, Section, Title, Button } from '@repo/ui'
import { ButtonWrapper } from './styles'
import SemanticTable from './SemanticTable'
import SemanticDetail from './SemanticDetail'

const SemanticPage = ({ path, poiList, onSave, onCancel }) => {
  const [loading, setLoading] = useState(false)
  const [mode, setMode] = useState('MODE_LIST')
  const [selectedRow, setSeletedRow] = useState(null)
  const [pois, setPois] = useState([])

  useEffect(() => {
    const newPois = poiList.map((poi) => ({
      ...poi,
      _work: { state: 'EXSITED' }
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
                state: 'DELETED'
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
                state: 'EXISTED'
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
      <StyledPageContent className="column">
        <Title>Semantic({path})</Title>
        {/* Command Button area */}
        <Section>
          <Title>Command Button area</Title>
          <ButtonWrapper>
            <Button size="md" onClick={handleSave}>
              저장
            </Button>
            <Button size="md" onClick={handleCancel}>
              취소
            </Button>
          </ButtonWrapper>
        </Section>

        <StyledPageContent className="row">
          {/* Map */}
          <Section>Map</Section>
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
        </StyledPageContent>
      </StyledPageContent>
    )
  )
}

export default SemanticPage
