import { useState, useEffect, useCallback, useMemo } from 'react'
import { StyledPageContent, Section, Title, Button } from '@repo/ui'
import { ButtonWrapper } from './styles'

import { Table } from '@repo/ui'

const SemanticDetail = ({ row, onPoiCreated, onPoiEdited, onPoiCancel }) => {
  const POI_TYPES = ['GENERAL', 'ETC']

  const [loading, setLoading] = useState(false)
  const [workObj, setWorkObj] = useState(null)

  const handlePoiCreate = () => {
    console.log('handlePoiCreate:', workObj)
    const retObj = { ...workObj }
    retObj._work.state = 'CREATED'
    onPoiCreated(retObj)
  }

  const handlePoiEdit = () => {
    const retObj = { ...workObj }
    retObj.name.default = '222'
    if (retObj._work.state === 'EXSITED') {
      retObj._work.state = 'EDITED'
    }
    onPoiEdited(retObj)
  }

  const handleTypeChange = (value) => {
    setWorkObj((prev) => ({
      ...prev,
      type: value,
      _work: {
        ...prev._work,
        state: prev._work.state === 'EXISTED' ? 'EDITED' : prev._work.state
      }
    }))
  }

  const handleNameChange = (lang, value) => {
    const newName = { ...workObj.name }
    newName[lang] = value
    setWorkObj((prev) => ({
      ...prev,
      name: newName
    }))
  }

  const handlePosChange = (axis, value) => {
    console.log(axis)
    const newPose = { ...workObj.pose }
    const floatValue = value === '' ? '' : parseFloat(value)
    newPose.position[axis] = floatValue
    setWorkObj((prev) => ({
      ...prev,
      pose: newPose
    }))
  }

  useEffect(() => {
    console.log(row)
    if (row) {
      const tempObj = { ...row }
      setWorkObj(tempObj)
    } else {
      const tempObj = {}
      tempObj.id = crypto.randomUUID()
      tempObj.type = 'GENERAL'
      tempObj.name = {}
      tempObj.name['default'] = ''
      tempObj.name['ko-KR'] = ''
      tempObj.name['en-US'] = ''
      tempObj.pose = {}
      tempObj.pose.position = {
        x: 0.0,
        y: 0.0,
        z: 0.0
      }
      tempObj._work = {}
      tempObj._work.state = 'CREATING'
      setWorkObj(tempObj)
    }
    setLoading(true)
  }, [])

  return (
    loading && (
      <>
        {workObj._work.state}
        <ButtonWrapper>
          {workObj._work.state === 'EXSITED' || workObj._work.state === 'CREATED' ? (
            <Button size="md" onClick={handlePoiEdit}>
              수정
            </Button>
          ) : (
            <Button size="md" onClick={handlePoiCreate}>
              생성
            </Button>
          )}
          <Button size="md" onClick={onPoiCancel}>
            취소
          </Button>
        </ButtonWrapper>

        {/* 세부정보 */}
        <div>
          <p>id :{row?.id} </p>
        </div>

        <div style={{ marginBottom: '12px' }}>
          <label>Type</label>

          <select value={workObj?.type || 'GENERAL'} onChange={(e) => handleTypeChange(e.target.value)}>
            <option value="GENERAL">GENERAL</option>
            <option value="ETC">ETC</option>
          </select>
        </div>

        <div style={{ marginBottom: '12px' }}>
          <label>기본 이름</label>
          <input
            type="text"
            value={workObj?.name?.default || ''}
            onChange={(e) => handleNameChange('default', e.target.value)}
          />
        </div>

        <div style={{ marginBottom: '12px' }}>
          <label>영문 이름</label>
          <input
            type="text"
            value={workObj?.name['en-US'] || ''}
            onChange={(e) => handleNameChange('en-US', e.target.value)}
          />
        </div>

        <div style={{ marginBottom: '12px' }}>
          <label>한글 이름</label>
          <input
            type="text"
            value={workObj?.name['ko-KR'] || ''}
            onChange={(e) => handleNameChange('ko-KR', e.target.value)}
          />
        </div>

        <h4>Position</h4>

        <div style={{ marginBottom: '12px' }}>
          <label>X</label>
          <input
            type="number"
            step="0.001"
            value={workObj?.pose?.position?.x ?? ''}
            onChange={(e) => handlePosChange('x', e.target.value)}
          />
        </div>

        <div style={{ marginBottom: '12px' }}>
          <label>Y</label>
          <input
            type="number"
            step="0.001"
            value={workObj?.pose?.position.y ?? ''}
            onChange={(e) => handlePosChange('y', e.target.value)}
          />
        </div>

        <div style={{ marginBottom: '12px' }}>
          <label>Z</label>
          <input
            type="number"
            step="0.001"
            value={workObj?.pose?.position.z ?? ''}
            onChange={(e) => handlePosChange('z', e.target.value)}
          />
        </div>
      </>
    )
  )
}

export default SemanticDetail
