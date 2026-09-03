import { useState, useEffect, useMemo, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { Section, Button, Dropdown, Modal } from '@repo/ui'
import { CommandBar, CommandButtons, CommandRow, CommandFilters, DetailModalBody, SemanticWorkspace } from './styles'
import SemanticTable from './SemanticTable'
import SemanticDetail from './SemanticDetail'
import ObstacleTable from './ObstacleTable'

// 편집 대상 종류. POI 는 점(pose), FIXED-OBSTACLE 은 지도에서 끌어 그린 사각형 영역이다.
const SEMANTIC_TYPE_POI = 'POI'
const SEMANTIC_TYPE_OBSTACLE = 'FIXED-OBSTACLE'
// const SEMANTIC_TYPES = [SEMANTIC_TYPE_POI, SEMANTIC_TYPE_OBSTACLE]
const SEMANTIC_TYPES = [SEMANTIC_TYPE_POI]
const OPERATION_TYPES = ['IN-USE', 'WORKING']

// 고정장애물의 형태. 사각형은 드래그 한 번으로, 폴리곤은 점을 하나씩 찍어 만든다.
// 지도 구현(init-setup 의 MapCanvas)도 같은 값을 쓴다.
const OBSTACLE_SHAPE_RECTANGLE = 'RECTANGLE'
const OBSTACLE_SHAPE_POLYGON = 'POLYGON'
const OBSTACLE_SHAPES = [OBSTACLE_SHAPE_RECTANGLE, OBSTACLE_SHAPE_POLYGON]

/** 점들을 감싸는 경계 — 폴리곤도 목록/조회에서 좌상단·우하단을 쓰므로 함께 들고 있는다. */
const boundsOfPoints = (points) => {
  const xs = points.map((point) => point.x)
  const ys = points.map((point) => point.y)
  const minX = Math.min(...xs)
  const maxX = Math.max(...xs)
  const minY = Math.min(...ys)
  const maxY = Math.max(...ys)
  return { topLeft: { x: minX, y: maxY }, bottomRight: { x: maxX, y: minY }, minX, minY, maxX, maxY }
}

/**
 * POI(시맨틱) 편집 화면 본문.
 *
 * 페이지 제목·위치 선택 등 페이지 껍데기는 이 컴포넌트를 쓰는 앱 페이지가 갖는다
 * (init-setup 의 Map/Semantic 은 StyledPageContent > Title / LocationBar / Section 구성).
 * 여기서는 명령 버튼 + (지도 | 목록/상세) 두 열만 렌더한다.
 *
 * @param {React.ReactNode|Function} [mapSlot] 왼쪽 지도 칸에 넣을 내용.
 *   지도 렌더러는 앱마다 달라서(init-setup 은 foxglove 기반 MapCanvas) 주입받는다.
 *   함수로 주면 지금 목록에 보이는 POI 를 넘겨준다 —
 *   ({ pois, obstacles, drawObstacleShape, onObstacleDrawn, selectedObstacleId, editingObstacleId,
 *     onObstacleResize, onObstacleVertexMove }) => ReactNode.
 *   지도에 POI 를 함께 그리려면 이 형태를 쓴다(작업본의 미저장 POI 까지 반영된다).
 *   pois 뒤의 값들은 고정장애물 편집용이다: obstacles 는 지금 목록에 있는 도형,
 *   drawObstacleShape 는 지금 그리는 중인 형태('RECTANGLE'/'POLYGON'/null),
 *   onObstacleDrawn 은 지도가 도형을 확정했을 때 목록에 넣는 콜백,
 *   selectedObstacleId/editingObstacleId 는 강조·꼭지점 편집 대상,
 *   onObstacleResize(사각형 크기 조절)와 onObstacleVertexMove(폴리곤 점 옮기기)는 지도에서
 *   좌표가 바뀔 때 목록에 반영하는 콜백이다
 *   (지도 구현이 이 값들을 받도록 되어 있어야 고정장애물 편집이 동작한다).
 * @param {object|null} [robotPose] 로봇 현재 위치 { x, y, yaw(rad) } — 지도와 같은 프레임.
 *   POI 상세의 '현재 위치로 설정' 버튼이 쓴다. 텔레메트리는 앱이 들고 있으므로 주입받는다.
 * @param {string} [noData] POI 가 하나도 없을 때 목록 자리에 보여줄 문구(앱의 i18n 문자열).
 * @param {Function} [onPoiGoto] 목록의 이동 버튼 — (poi) => void. 이동 명령은 앱이 갖고 있으므로
 *   주입받고, 없으면 이동 버튼을 아예 노출하지 않는다(이동을 지원하지 않는 앱).
 * @param {boolean} [gotoDisabled] 이동 버튼을 잠글지 — 이미 주행 중이거나 요청 중일 때 앱이 켠다.
 * @param {string} [gotoLabel] 이동 버튼 문구(앱의 i18n 문자열). 없으면 semantic 번역의 goto 를 쓴다.
 */
const SemanticPage = ({
  poiVersion,
  poiList,
  onSave,
  onCancel,
  mapSlot,
  robotPose = null,
  noData = '',
  onPoiGoto = null,
  gotoDisabled = false,
  gotoLabel = ''
}) => {
  const { t } = useTranslation('semantic')
  const { t: tCommon } = useTranslation('common')

  const [loading, setLoading] = useState(false)
  const [mode, setMode] = useState('MODE_LIST')
  const [selectedRow, setSeletedRow] = useState(null)
  const [pois, setPois] = useState([])
  const [workingPois, setWorkingPois] = useState([])
  // Table 의 operation 필터(IN-USE/WORKING). SemanticTable 은 상세 진입 시 언마운트되므로
  // 필터가 리셋되지 않도록 여기(부모)에서 들고 있는다.
  const [operationMode, setOperationMode] = useState('IN-USE')
  const [semanticType, setSemanticType] = useState(SEMANTIC_TYPE_POI)

  // 고정장애물 — 아직 BE 연동이 없어 화면 안에서만 들고 있는다(새로 고치면 사라진다).
  // POI 와 같은 구분을 쓴다: obstacles 는 저장된 것(IN-USE), workingObstacles 는 작업본(WORKING).
  // 편집은 작업본에만 하고, 임시 저장을 누를 때 IN-USE 로 옮긴다 — BE 가 붙으면 이 두 자리가
  // 조회 결과와 저장 요청으로 바뀐다(지금은 저장이 화면 안에서 끝난다).
  const [obstacles, setObstacles] = useState([])
  const [workingObstacles, setWorkingObstacles] = useState([])
  // 다음에 추가할 형태(사각형/폴리곤) — '고정장애물 추가' 가 이 형태로 그리기를 시작한다.
  const [obstacleShape, setObstacleShape] = useState(OBSTACLE_SHAPE_RECTANGLE)
  // 지도에서 그리는 중인 형태. null 이면 꺼진 상태다. '고정장애물 추가' 로 켜고, 도형 하나를
  // 확정하면 다시 꺼진다 — 켜져 있는 동안에는 지도 클릭이 그리기라 계속 켜 두면 안 된다.
  const [drawingShape, setDrawingShape] = useState(null)
  // 목록에서 고른 장애물 — 지도에서 그 사각형만 강조한다(목록과 지도를 눈으로 잇는 용도).
  const [selectedObstacleId, setSelectedObstacleId] = useState(null)
  // 크기를 고치는 중인 장애물 — 지도에서 그 사각형에만 모서리 손잡이가 붙는다.
  const [editingObstacleId, setEditingObstacleId] = useState(null)
  const isObstacleType = semanticType === SEMANTIC_TYPE_OBSTACLE
  const isWorking = operationMode === 'WORKING'
  // 고정장애물을 고칠 수 있는 조건 — 작업본(WORKING)일 때만이다. IN-USE 는 저장된 결과를
  // 보여주는 읽기 전용 화면이라 POI 목록과 같은 규약을 따른다.
  const canEditObstacles = isObstacleType && isWorking

  // 고칠 수 없는 상태(POI 타입으로 되돌림, IN-USE 조회)에서는 그리기/꼭지점 편집을 끝낸다 —
  // 켜진 채로 남으면 지도 클릭만 막히고 결과는 어디에도 반영되지 않는다.
  useEffect(() => {
    if (canEditObstacles) return
    setDrawingShape(null)
    setEditingObstacleId(null)
  }, [canEditObstacles])

  /**
   * 지도가 도형을 확정했을 때 — 작업본에 넣고 그리기 모드를 끈다.
   * 사각형은 경계(min/max)만으로 모양이 정해지고, 폴리곤은 찍은 점을 모두 들고 있는다
   * (경계는 목록 표시·조회용으로 함께 담겨 온다).
   */
  const handleObstacleDrawn = useCallback((drawn) => {
    // BE 연동 전까지 쓰는 화면 안의 식별자 — 선택/수정/삭제 대상을 가리키는 데만 쓴다.
    const id = `obstacle-${Date.now()}`
    setWorkingObstacles((prev) => [
      ...prev,
      {
        id,
        shape: drawn.shape ?? OBSTACLE_SHAPE_RECTANGLE,
        ...(drawn.points ? { points: drawn.points } : {}),
        topLeft: drawn.topLeft,
        bottomRight: drawn.bottomRight,
        minX: drawn.minX,
        minY: drawn.minY,
        maxX: drawn.maxX,
        maxY: drawn.maxY,
        // 아직 저장되지 않은 새 장애물 — inUsed 가 없으므로 목록의 '사용 중' 칸도 비어 있다.
        editStatus: { needToSave: true }
      }
    ])
    setDrawingShape(null)
    // 방금 그린 도형을 골라 둔다 — 여러 개가 있을 때 어느 것이 새로 들어온 줄인지 보인다.
    setSelectedObstacleId(id)
  }, [])

  /** 사각형 모서리를 끄는 동안 작업본 좌표를 갱신한다 — 지도와 목록의 좌표가 함께 따라온다. */
  const handleObstacleResize = useCallback((id, rect) => {
    setWorkingObstacles((prev) =>
      prev.map((obstacle) =>
        obstacle.id === id
          ? {
              ...obstacle,
              topLeft: rect.topLeft,
              bottomRight: rect.bottomRight,
              minX: rect.minX,
              minY: rect.minY,
              maxX: rect.maxX,
              maxY: rect.maxY,
              editStatus: { ...obstacle.editStatus, needToSave: true }
            }
          : obstacle
      )
    )
  }, [])

  /** 폴리곤의 점 하나를 옮긴다 — 나머지 점은 그대로 두고 경계만 다시 계산한다. */
  const handleObstacleVertexMove = useCallback((id, index, point) => {
    setWorkingObstacles((prev) =>
      prev.map((obstacle) => {
        if (obstacle.id !== id || !Array.isArray(obstacle.points)) return obstacle
        const points = obstacle.points.map((current, i) => (i === index ? { x: point.x, y: point.y } : current))
        return {
          ...obstacle,
          points,
          ...boundsOfPoints(points),
          editStatus: { ...obstacle.editStatus, needToSave: true }
        }
      })
    )
  }, [])

  /** 수정 버튼 — 같은 행을 다시 누르면 편집을 끝낸다. 편집 대상은 선택 대상도 된다. */
  const handleObstacleEditToggle = useCallback((id) => {
    setSelectedObstacleId(id)
    setEditingObstacleId((prev) => (prev === id ? null : id))
    // 그리기와 꼭지점 편집은 둘 다 지도 조작을 쓰므로 함께 켜 두지 않는다.
    setDrawingShape(null)
  }, [])

  /**
   * 삭제 — POI 와 같이 목록에서 바로 지우지 않고 삭제 예정(softDelete)으로 표시한다.
   * 임시 저장 전까지는 되돌릴 수 있어야 하고, 지도에서도 무채색으로 남아 무엇이 지워질지 보인다.
   */
  const handleObstacleDelete = useCallback((id) => {
    setWorkingObstacles((prev) =>
      prev.map((obstacle) =>
        obstacle.id === id
          ? { ...obstacle, editStatus: { ...obstacle.editStatus, softDelete: true, needToSave: true } }
          : obstacle
      )
    )
    // 지워질 사각형을 계속 고치는 중으로 두면 지도에 손잡이만 남는다(선택은 그대로 둔다 —
    // 어느 줄을 지우기로 했는지 지도에서 확인해야 한다).
    setEditingObstacleId((prev) => (prev === id ? null : prev))
  }, [])

  const handleObstacleRestore = useCallback((id) => {
    setWorkingObstacles((prev) =>
      prev.map((obstacle) =>
        obstacle.id === id
          ? { ...obstacle, editStatus: { ...obstacle.editStatus, softDelete: false, needToSave: true } }
          : obstacle
      )
    )
  }, [])

  /**
   * 그리기 토글 — 지금 고른 형태로 시작하고, 다시 누르면 끈다.
   * 켜는 동안에는 꼭지점 편집을 끝낸다(지도 조작이 겹친다).
   */
  const handleObstacleDrawToggle = useCallback(() => {
    setDrawingShape((prev) => {
      if (prev) return null
      setEditingObstacleId(null)
      return obstacleShape
    })
  }, [obstacleShape])

  /**
   * 고정장애물 임시 저장 — 작업본을 IN-USE 로 옮긴다(삭제 예정은 여기서 실제로 빠진다).
   * BE 가 붙으면 이 자리가 저장 요청 + 재조회가 되고, 지금은 화면 안에서 끝난다.
   */
  const handleObstacleSave = useCallback(() => {
    const saved = workingObstacles
      .filter((obstacle) => !obstacle.editStatus?.softDelete)
      // eslint-disable-next-line no-unused-vars
      .map(({ editStatus, ...obstacle }) => obstacle)
    setObstacles(saved)
    // 저장 직후의 작업본은 저장된 것의 사본이다(POI 의 inUsed 사본과 같은 규약).
    setWorkingObstacles(saved.map((obstacle) => ({ ...obstacle, editStatus: { inUsed: true } })))
    setEditingObstacleId(null)
    setDrawingShape(null)
  }, [workingObstacles])

  /** 취소 — 작업본을 저장된 것(IN-USE) 기준으로 되돌린다. */
  const handleObstacleCancel = useCallback(() => {
    setWorkingObstacles(obstacles.map((obstacle) => ({ ...obstacle, editStatus: { inUsed: true } })))
    setEditingObstacleId(null)
    setDrawingShape(null)
  }, [obstacles])

  // 목록/지도에 지금 보이는 고정장애물 — POI 와 같은 규약이다.
  const visibleObstacles = useMemo(
    () => (isWorking ? workingObstacles : obstacles),
    [isWorking, workingObstacles, obstacles]
  )

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
                  label={t('filterType')}
                  size="md"
                  value={semanticType}
                  // 타입 이름은 코드 값(POI/FIXED-OBSTACLE)이라 그대로 보여줄 수 없다 — 번역이
                  // 없으면 값을 그대로 쓴다(BE 가 새 타입을 추가해도 목록은 그려진다).
                  options={SEMANTIC_TYPES.map((tp) => ({ name: t(`semanticTypes.${tp}`, tp), value: tp }))}
                  onChange={setSemanticType}
                />
                {/* IN-USE(저장된 것) / WORKING(작업본) — POI 와 고정장애물이 같은 필터를 쓴다. */}
                <Dropdown
                  label={t('filterOperation')}
                  size="md"
                  value={operationMode}
                  options={OPERATION_TYPES.map((op) => ({ name: op, value: op }))}
                  onChange={setOperationMode}
                />
              </CommandFilters>
              {isWorking && (
                <CommandButtons>
                  {/* 저장/취소 대상은 지금 보고 있는 종류의 작업본이다. POI 는 앱이 저장을 갖고
                      있고(onSave), 고정장애물은 아직 BE 가 없어 화면 안에서 끝난다.
                      POI 상세가 열려 있는 동안 잠그는 것은 POI 쪽 흐름에만 해당한다. */}
                  <Button
                    disabled={!isObstacleType && mode === 'MODE_DETAIL'}
                    size="md"
                    onClick={isObstacleType ? handleObstacleSave : handleSave}
                  >
                    {t('tempSave')}
                  </Button>
                  <Button
                    theme="tertiary"
                    disabled={!isObstacleType && mode === 'MODE_DETAIL'}
                    size="md"
                    onClick={isObstacleType ? handleObstacleCancel : handleCancel}
                  >
                    {tCommon('cancel')}
                  </Button>
                </CommandButtons>
              )}
            </CommandRow>
          </Section>
        </CommandBar>

        <SemanticWorkspace className="row">
          {/* Map — 지도와 목록이 같은 POI 를 보도록, 표시 중인 목록(visiblePois)을 그대로 넘긴다 */}
          <Section>
            {typeof mapSlot === 'function'
              ? mapSlot({
                  pois: visiblePois,
                  obstacles: visibleObstacles,
                  drawObstacleShape: drawingShape,
                  onObstacleDrawn: handleObstacleDrawn,
                  selectedObstacleId,
                  editingObstacleId,
                  onObstacleResize: handleObstacleResize,
                  onObstacleVertexMove: handleObstacleVertexMove
                })
              : (mapSlot ?? 'Map')}
          </Section>
          {/* Pannel — 목록은 상세를 여는 동안에도 계속 보여준다(어느 POI 를 고쳤는지 보이도록) */}
          <Section>
            {isObstacleType ? (
              <ObstacleTable
                obstacles={visibleObstacles}
                // 편집(추가/수정/삭제)은 작업본에서만 — IN-USE 는 저장된 결과를 보는 화면이다.
                editable={canEditObstacles}
                shapes={OBSTACLE_SHAPES}
                shape={obstacleShape}
                drawingShape={drawingShape}
                selectedId={selectedObstacleId}
                editingId={editingObstacleId}
                onShapeChange={setObstacleShape}
                onDrawToggle={handleObstacleDrawToggle}
                onSelect={setSelectedObstacleId}
                onEditToggle={handleObstacleEditToggle}
                onDelete={handleObstacleDelete}
                onRestore={handleObstacleRestore}
              />
            ) : (
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
                onPoiGoto={onPoiGoto} // goto — 실제 이동 명령은 앱이 갖는다
                gotoDisabled={gotoDisabled}
                gotoLabel={gotoLabel}
              ></SemanticTable>
            )}
          </Section>
        </SemanticWorkspace>

        {/* 상세/생성 폼 — 모달로 띄운다. 아래에 펼치면 지도·목록 높이만큼 밀려 폼이 화면 밖에서
            열렸다(스크롤해야 보였다).
            모달 헤더는 두지 않는다(title/closeButton 없음) — 제목과 취소/닫기 버튼을 이미
            SemanticDetail 이 갖고 있어 X 를 두면 닫는 길이 둘로 갈린다.
            onClose 는 남겨 둔다 — 공용 Modal 이 배경 클릭 닫기를 연결하면 그때 쓰인다.
            key 로 편집 대상이 바뀔 때 다시 마운트한다 — SemanticDetail 은 마운트 시점에만
            row 를 폼으로 옮기므로(useEffect deps []), 목록이 살아 있는 지금은 다른 POI 를
            눌러도 폼이 그대로 남는다. */}
        <Modal isOpen={mode !== 'MODE_LIST'} size="lg" onClose={handlePoiCancel}>
          <DetailModalBody>
            <SemanticDetail
              key={selectedRow?.poiId ?? 'new'}
              row={selectedRow}
              readOnly={mode === 'MODE_VIEW'}
              robotPose={robotPose}
              onPoiCreated={handleCreated}
              onPoiEdited={handleEdited}
              onPoiCancel={handlePoiCancel}
            ></SemanticDetail>
          </DetailModalBody>
        </Modal>
      </>
    )
  )
}

export default SemanticPage
