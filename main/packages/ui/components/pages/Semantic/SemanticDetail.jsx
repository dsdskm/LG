import { useState, useEffect } from 'react'
import { Section, SectionTitle, Button, Input, Dropdown, IconButton, Icon } from '@repo/ui'
import { ButtonWrapper, DetailWrapper, FieldGrid, MetaText, PropertyRow } from './styles'

const SemanticDetail = ({ row, onPoiCreated, onPoiEdited, onPoiCancel }) => {
  const POI_TYPES = ['GENERAL', 'ETC']

  const [loading, setLoading] = useState(false)
  const [workObj, setWorkObj] = useState(null)
  // properties 편집용 로컬 배열. key 이름 변경/추가/삭제를 다루기 쉽게 배열로 들고,
  // 저장 시점의 workObj.properties(객체)로는 syncProperties 가 직렬화한다.
  const [propEntries, setPropEntries] = useState([])

  const handlePoiCreate = () => {
    const retObj = { ...workObj }
    retObj._work.created = true
    onPoiCreated(retObj)
  }

  const handlePoiEdit = () => {
    console.log('handlePoiEdit')
    const retObj = { ...workObj }
    retObj._work.edited = true
    onPoiEdited(retObj)
  }

  const handleTypeChange = (value) => {
    setWorkObj((prev) => ({
      ...prev,
      type: value
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
    const newPose = { ...workObj.pose }
    const floatValue = value === '' ? '' : parseFloat(value)
    newPose.position[axis] = floatValue
    setWorkObj((prev) => ({
      ...prev,
      pose: newPose
    }))
  }

  const handleOrientationChange = (axis, value) => {
    const newPose = { ...workObj.pose }
    const floatValue = value === '' ? '' : parseFloat(value)
    newPose.orientation[axis] = floatValue
    setWorkObj((prev) => ({
      ...prev,
      pose: newPose
    }))
  }

  const handleYawDegChange = (value) => {
    const floatValue = value === '' ? '' : parseFloat(value)
    setWorkObj((prev) => ({
      ...prev,
      yawDeg: floatValue
    }))
  }

  const handleToleranceChange = (value) => {
    const floatValue = value === '' ? '' : parseFloat(value)
    setWorkObj((prev) => ({
      ...prev,
      tolerance: floatValue
    }))
  }

  // 편집 배열 → properties 객체(string 값). 빈 key 는 제외, 중복 key 는 나중 값이 우선.
  const syncProperties = (entries) => {
    const obj = {}
    entries.forEach(({ key, value }) => {
      const k = key.trim()
      if (k) obj[k] = value
    })
    setWorkObj((prev) => ({
      ...prev,
      properties: obj
    }))
  }

  const handlePropKeyChange = (id, key) => {
    const next = propEntries.map((e) => (e.id === id ? { ...e, key } : e))
    setPropEntries(next)
    syncProperties(next)
  }

  const handlePropValueChange = (id, value) => {
    const next = propEntries.map((e) => (e.id === id ? { ...e, value } : e))
    setPropEntries(next)
    syncProperties(next)
  }

  const handleAddProp = () => {
    if (propEntries.length >= 5) return
    setPropEntries((prev) => [...prev, { id: crypto.randomUUID(), key: '', value: '' }])
  }

  const handleRemoveProp = (id) => {
    const next = propEntries.filter((e) => e.id !== id)
    setPropEntries(next)
    syncProperties(next)
  }

  useEffect(() => {
    if (row) {
      const tempObj = { ...row }
      if (!tempObj.properties) tempObj.properties = {}
      setWorkObj(tempObj)
      setPropEntries(
        Object.entries(tempObj.properties).map(([key, value]) => ({
          id: crypto.randomUUID(),
          key,
          value: String(value)
        }))
      )
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
      tempObj.pose.orientation = {
        x: 0.0,
        y: 0.0,
        z: 0.0,
        w: 0.0
      }
      tempObj.yawDeg = 0.0
      tempObj.properties = {}
      tempObj._work = {}
      setWorkObj(tempObj)
    }
    setLoading(true)
  }, [])

  return (
    loading && (
      <DetailWrapper key={workObj.id}>
        {/* 상단: 상태 + 액션 버튼 */}
        <Section>
          <SectionTitle title="POI 상세">
            <MetaText>{workObj._work.state}</MetaText>
          </SectionTitle>
          <ButtonWrapper>
            {workObj._work.saved || workObj._work.created ? (
              <Button size="md" onClick={handlePoiEdit}>
                수정
              </Button>
            ) : (
              <Button size="md" onClick={handlePoiCreate}>
                생성
              </Button>
            )}
            <Button size="md" variant="outline" onClick={onPoiCancel}>
              취소
            </Button>
          </ButtonWrapper>
        </Section>

        {/* 기본 정보 */}
        <Section gap="1.2rem">
          <SectionTitle title="기본 정보" />
          <MetaText>ID: {workObj.id}</MetaText>
          <Dropdown
            label="Type"
            size="md"
            value={workObj.type}
            options={POI_TYPES.map((t) => ({ name: t, value: t }))}
            onChange={(value) => handleTypeChange(value)}
          />
          <Input
            label="기본 이름"
            size="md"
            value={workObj.name?.default || ''}
            onChange={(e) => handleNameChange('default', e.target.value)}
          />
          <FieldGrid>
            <Input
              label="영문 이름"
              size="md"
              value={workObj.name?.['en-US'] || ''}
              onChange={(e) => handleNameChange('en-US', e.target.value)}
            />
            <Input
              label="한글 이름"
              size="md"
              value={workObj.name?.['ko-KR'] || ''}
              onChange={(e) => handleNameChange('ko-KR', e.target.value)}
            />
          </FieldGrid>
        </Section>

        {/* Position */}
        <Section gap="1.2rem">
          <SectionTitle title="Position" />
          <FieldGrid>
            {['x', 'y', 'z'].map((axis) => (
              <Input
                key={axis}
                label={axis.toUpperCase()}
                type="number"
                step="0.001"
                size="md"
                value={workObj.pose?.position?.[axis] ?? ''}
                onChange={(e) => handlePosChange(axis, e.target.value)}
              />
            ))}
          </FieldGrid>
        </Section>

        {/* Orientation */}
        <Section gap="1.2rem">
          <SectionTitle title="Orientation" />
          <FieldGrid>
            {['x', 'y', 'z', 'w'].map((axis) => (
              <Input
                key={axis}
                label={axis.toUpperCase()}
                type="number"
                step="0.001"
                size="md"
                value={workObj.pose?.orientation?.[axis] ?? ''}
                onChange={(e) => handleOrientationChange(axis, e.target.value)}
              />
            ))}
          </FieldGrid>
        </Section>

        {/* 기타 */}
        <Section gap="1.2rem">
          <SectionTitle title="기타" />
          <FieldGrid>
            <Input
              label="yaw deg"
              type="number"
              step="0.001"
              unit="°"
              size="md"
              value={workObj.yawDeg ?? 0.0}
              onChange={(e) => handleYawDegChange(e.target.value)}
            />
            <Input
              label="tolerance"
              type="number"
              step="0.001"
              size="md"
              value={workObj.tolerance ?? 0.0}
              onChange={(e) => handleToleranceChange(e.target.value)}
            />
          </FieldGrid>
        </Section>

        {/* Properties (사용자 정의 key/value, string 값, 최대 5개) */}
        <Section gap="1.2rem">
          <SectionTitle title="Properties">
            <IconButton size="sm" onClick={handleAddProp} disabled={propEntries.length >= 5}>
              <Icon name="add" size={18} />
            </IconButton>
          </SectionTitle>
          <MetaText>키/값 문자열, 최대 5개</MetaText>
          {propEntries.map((entry) => (
            <PropertyRow key={entry.id}>
              <div className="field">
                <Input
                  size="sm"
                  placeholder="key"
                  value={entry.key}
                  onChange={(e) => handlePropKeyChange(entry.id, e.target.value)}
                />
              </div>
              <div className="field">
                <Input
                  size="sm"
                  placeholder="value"
                  value={entry.value}
                  onChange={(e) => handlePropValueChange(entry.id, e.target.value)}
                />
              </div>
              <IconButton size="sm" onClick={() => handleRemoveProp(entry.id)}>
                <Icon name="subtract" size={18} />
              </IconButton>
            </PropertyRow>
          ))}
        </Section>
      </DetailWrapper>
    )
  )
}

export default SemanticDetail
