import { useState, useEffect } from 'react'
import { Section, SectionTitle, Button, Input, Dropdown, IconButton, Icon } from '@repo/ui'
import { generateUuid36 } from '@repo/utils'
import { DetailHeader, DetailWrapper, FieldGrid, MetaText, PropertyRow } from './styles'

const DEG2RAD = Math.PI / 180
const RAD2DEG = 180 / Math.PI
const round6 = (n) => Math.round(n * 1e6) / 1e6
// yaw(도) → Z축 회전 쿼터니언 (REP-103; init-setup tf.js 의 yawOf 와 동일 규약)
const yawDegToQuaternion = (deg) => {
  const half = ((Number(deg) || 0) * DEG2RAD) / 2
  return { x: 0, y: 0, z: round6(Math.sin(half)), w: round6(Math.cos(half)) }
}

/**
 * @param {object|null} [robotPose] 로봇 현재 위치 { x, y, yaw(rad), z? } — 지도와 같은 프레임이어야 한다.
 *   주입한 쪽이 프레임을 확인해서 넘긴다(init-setup 은 map 프레임일 때만 넘긴다).
 *   있으면 Position 에 '현재 위치로 설정' 버튼이 열린다.
 */
const SemanticDetail = ({ row, readOnly = false, robotPose = null, onPoiCreated, onPoiEdited, onPoiCancel }) => {
  const POI_TYPES = ['GENERAL', 'ETC']

  const [loading, setLoading] = useState(false)
  const [workObj, setWorkObj] = useState(null)
  // properties 편집용 로컬 배열. key 이름 변경/추가/삭제를 다루기 쉽게 배열로 들고,
  // 저장 시점의 workObj.properties(객체)로는 syncProperties 가 직렬화한다.
  const [propEntries, setPropEntries] = useState([])

  const handlePoiCreate = () => {
    const retObj = { ...workObj }
    retObj.editStatus.needToSave = true
    retObj.editStatus.created = true
    onPoiCreated(retObj)
  }

  const handlePoiEdit = () => {
    console.log('handlePoiEdit')
    const retObj = { ...workObj }
    retObj.editStatus.needToSave = true
    retObj.editStatus.edited = true
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

  /**
   * 로봇이 지금 서 있는 자리를 POI 좌표로 그대로 넣는다 — 로봇을 원하는 지점에 세워 두고
   * 이 버튼을 누르는 것이 좌표를 손으로 입력하는 것보다 정확하다.
   *
   * yaw 는 rad 로 들어오므로 도(度)로 바꿔 넣고, orientation 은 다른 입력과 같은 경로로
   * yaw 에서 파생시킨다. z 는 TF 합성 결과에 없으므로(2D 주행) 값이 있을 때만 덮어쓴다.
   */
  const handleUseRobotPose = () => {
    if (!robotPose) return
    const yawDeg = round6((Number(robotPose.yaw) || 0) * RAD2DEG)
    setWorkObj((prev) => ({
      ...prev,
      yawDeg,
      pose: {
        ...prev.pose,
        position: {
          ...prev.pose?.position,
          x: round6(Number(robotPose.x) || 0),
          y: round6(Number(robotPose.y) || 0),
          ...(Number.isFinite(robotPose.z) ? { z: round6(robotPose.z) } : {})
        },
        orientation: yawDegToQuaternion(yawDeg)
      }
    }))
  }

  const handleYawDegChange = (value) => {
    const floatValue = value === '' ? '' : parseFloat(value)
    setWorkObj((prev) => ({
      ...prev,
      yawDeg: floatValue,
      // orientation 은 사용자가 직접 입력하지 않고 yaw 로부터 파생한다.
      pose: { ...prev.pose, orientation: yawDegToQuaternion(floatValue === '' ? 0 : floatValue) }
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

  const handlePropKeyChange = (poiId, key) => {
    const next = propEntries.map((e) => (e.poiId === poiId ? { ...e, key } : e))
    setPropEntries(next)
    syncProperties(next)
  }

  const handlePropValueChange = (poiId, value) => {
    const next = propEntries.map((e) => (e.poiId === poiId ? { ...e, value } : e))
    setPropEntries(next)
    syncProperties(next)
  }

  const handleAddProp = () => {
    if (propEntries.length >= 5) return
    setPropEntries((prev) => [...prev, { poiId: generateUuid36(), key: '', value: '' }])
  }

  const handleRemoveProp = (poiId) => {
    const next = propEntries.filter((e) => e.poiId !== poiId)
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
          poiId: generateUuid36(),
          key,
          value: String(value)
        }))
      )
    } else {
      const tempObj = {}
      tempObj.poiId = generateUuid36()
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
      tempObj.yawDeg = 0.0
      tempObj.pose.orientation = yawDegToQuaternion(0) // { x:0, y:0, z:0, w:1 }
      tempObj.properties = {}
      tempObj.editStatus = {}
      setWorkObj(tempObj)
    }
    setLoading(true)
  }, [])

  return (
    loading && (
      <DetailWrapper key={workObj.id}>
        {/* 상단: 제목 + 액션 버튼. SectionTitle 의 children 자리(오른쪽)에 버튼을 넣어 한 줄로 둔다 */}
        <DetailHeader>
          <Section>
            <SectionTitle title={readOnly ? 'POI 상세 (읽기 전용)' : 'POI 상세'}>
              {readOnly ? (
                <Button size="md" variant="outline" onClick={onPoiCancel}>
                  닫기
                </Button>
              ) : (
                <>
                  {row ? (
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
                </>
              )}
            </SectionTitle>
          </Section>
        </DetailHeader>

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
            disabled={readOnly}
          />
          <Input
            label="기본 이름"
            size="md"
            readOnly={readOnly}
            value={workObj.name?.default || ''}
            onChange={(e) => handleNameChange('default', e.target.value)}
          />
          <FieldGrid>
            <Input
              label="영문 이름"
              size="md"
              readOnly={readOnly}
              value={workObj.name?.['en-US'] || ''}
              onChange={(e) => handleNameChange('en-US', e.target.value)}
            />
            <Input
              label="한글 이름"
              size="md"
              readOnly={readOnly}
              value={workObj.name?.['ko-KR'] || ''}
              onChange={(e) => handleNameChange('ko-KR', e.target.value)}
            />
          </FieldGrid>
        </Section>

        {/* Position — 좌표 직접 입력, 또는 로봇이 서 있는 자리를 그대로 가져오기 */}
        <Section gap="1.2rem">
          <SectionTitle title="Position">
            {!readOnly && (
              <Button
                size="sm"
                variant="outline"
                onClick={handleUseRobotPose}
                disabled={!robotPose}
                title={robotPose ? undefined : '로봇 현재 위치를 아직 받지 못했습니다'}
              >
                현재 위치로 설정
              </Button>
            )}
          </SectionTitle>
          <FieldGrid>
            {['x', 'y', 'z'].map((axis) => (
              <Input
                key={axis}
                label={axis.toUpperCase()}
                type="number"
                step="0.001"
                size="md"
                readOnly={readOnly}
                value={workObj.pose?.position?.[axis] ?? ''}
                onChange={(e) => handlePosChange(axis, e.target.value)}
              />
            ))}
          </FieldGrid>
        </Section>

        {/* Orientation */}
        <Section gap="1.2rem">
          <SectionTitle title="Orientation" />
          <MetaText>yaw 로부터 자동 계산</MetaText>
          <FieldGrid>
            {['x', 'y', 'z', 'w'].map((axis) => (
              <Input
                key={axis}
                label={axis.toUpperCase()}
                type="number"
                step="0.001"
                size="md"
                readOnly
                value={workObj.pose?.orientation?.[axis] ?? ''}
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
              readOnly={readOnly}
              value={workObj.yawDeg ?? 0.0}
              onChange={(e) => handleYawDegChange(e.target.value)}
            />
            <Input
              label="tolerance"
              type="number"
              step="0.001"
              size="md"
              readOnly={readOnly}
              value={workObj.tolerance ?? 0.0}
              onChange={(e) => handleToleranceChange(e.target.value)}
            />
          </FieldGrid>
        </Section>

        {/* Properties (사용자 정의 key/value, string 값, 최대 5개) */}
        <Section gap="1.2rem">
          <SectionTitle title="Properties">
            {!readOnly && (
              <IconButton size="sm" onClick={handleAddProp} disabled={propEntries.length >= 5}>
                <Icon name="add" size={18} />
              </IconButton>
            )}
          </SectionTitle>
          {!readOnly && <MetaText>키/값 문자열, 최대 5개</MetaText>}
          {propEntries.map((entry) => (
            <PropertyRow key={entry.poiId}>
              <div className="field">
                <Input
                  size="sm"
                  placeholder="key"
                  readOnly={readOnly}
                  value={entry.key}
                  onChange={(e) => handlePropKeyChange(entry.poiId, e.target.value)}
                />
              </div>
              <div className="field">
                <Input
                  size="sm"
                  placeholder="value"
                  readOnly={readOnly}
                  value={entry.value}
                  onChange={(e) => handlePropValueChange(entry.poiId, e.target.value)}
                />
              </div>
              {!readOnly && (
                <IconButton size="sm" onClick={() => handleRemoveProp(entry.poiId)}>
                  <Icon name="subtract" size={18} />
                </IconButton>
              )}
            </PropertyRow>
          ))}
        </Section>
      </DetailWrapper>
    )
  )
}

export default SemanticDetail
