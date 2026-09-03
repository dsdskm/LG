import { Suspense, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { Button, Dropdown, Icon, TableCard } from '@repo/ui'
import { ButtonWrapper, CommandFilters, MetaText, RowCommands } from './styles'

/** 좌표 한 쌍을 목록에 보여줄 문구로 — POI 목록의 position 칸과 같은 표기다. */
const pointText = (point) =>
  point && typeof point.x === 'number' && typeof point.y === 'number'
    ? `[ ${point.x.toFixed(2)}, ${point.y.toFixed(2)} ]`
    : ''

// 선택된 행의 배경 — 지도에서 강조하는 도형과 같은 붉은 계열로 두어 목록과 지도가
// 같은 것을 가리킨다는 것이 한눈에 보이게 한다(MapCanvas 의 OBSTACLE_SELECTED_FILL).
const SELECTED_ROW_BACKGROUND = 'rgba(231, 76, 60, 0.1)'

const POLYGON = 'POLYGON'

/**
 * 목록에 보여줄 꼭지점들 — 사각형과 폴리곤을 같은 방식으로 보여주기 위해 사각형도 네 꼭지점으로
 * 펼친다. 순서는 지도(MapCanvas)가 그리는 순서와 같다: 좌상 → 우상 → 우하 → 좌하.
 */
const obstaclePoints = (obstacle) => {
  if (Array.isArray(obstacle?.points)) return obstacle.points
  const { minX, minY, maxX, maxY } = obstacle ?? {}
  if ([minX, minY, maxX, maxY].some((value) => typeof value !== 'number')) return []
  return [
    { x: minX, y: maxY },
    { x: maxX, y: maxY },
    { x: maxX, y: minY },
    { x: minX, y: minY }
  ]
}

/** 꼭지점 좌표를 찍은 순서대로 보여준다 — 칸 폭을 넘으면 다음 줄로 내려간다(column wrap). */
const ObstaclePointList = ({ points }) => (
  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.2rem 1.2rem', padding: '0.4rem 0' }}>
    {points.map((point, index) => (
      <span key={index}>
        {index + 1}. {pointText(point)}
      </span>
    ))}
  </div>
)

/** '사용 중' 표시 — POI 목록(SemanticTable)과 같은 배지다. */
const InUseBadge = () => (
  <span
    style={{
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      width: '3.2rem',
      height: '3.2rem',
      borderRadius: '50%',
      background: '#f0f9ff',
      border: '1px solid #e0f2fe'
    }}
  >
    <Icon name="check" size={18} color="#0284c7" />
  </span>
)

/**
 * 고정장애물 목록.
 *
 * 지도에서 그린 도형(사각형/폴리곤)을 좌표와 함께 보여주고, 작업본(WORKING)에서 모양 수정과
 * 삭제를 할 수 있다(이름·타입 같은 속성이 없으므로 POI 처럼 상세 폼을 두지 않는다).
 * 행을 누르면 그 도형이 지도에서 강조되고, 수정을 누르면 지도의 꼭지점 손잡이로 모양을 고친다.
 * 삭제는 POI 와 같이 삭제 예정 표시이고 임시 저장 전까지 되돌릴 수 있다.
 *
 * 목록의 좌상단/우하단은 사각형에서는 실제 꼭지점, 폴리곤에서는 점들을 감싸는 경계다.
 * 폴리곤의 점은 모두 저장되므로 행을 펼쳐(▸) 전부 확인할 수 있다.
 *
 * @param {Array} obstacles { id, shape, points?, topLeft, bottomRight, editStatus } 목록.
 * @param {boolean} [editable] 편집 가능 여부 — 작업본(WORKING)일 때만 true.
 *   false 면 추가/수정/삭제 버튼을 노출하지 않는다(IN-USE 는 저장된 결과를 보는 화면이다).
 * @param {string[]} [shapes] 고를 수 있는 형태 목록.
 * @param {string} [shape] 다음에 추가할 형태.
 * @param {string|null} [drawingShape] 지금 지도에서 그리는 중인 형태 — null 이면 그리지 않는 중.
 * @param {string|number|null} selectedId 지도에서 강조 중인 장애물 id.
 * @param {string|number|null} editingId 꼭지점으로 모양을 고치는 중인 장애물 id.
 * @param {Function} onShapeChange (shape) => void — 형태 선택.
 * @param {Function} onDrawToggle 추가/취소 버튼.
 * @param {Function} onSelect (id) => void — 행 클릭.
 * @param {Function} onEditToggle (id) => void — 수정/수정 완료.
 * @param {Function} onDelete (id) => void — 삭제 예정으로 표시.
 * @param {Function} onRestore (id) => void — 삭제 취소.
 * @param {string} [noData] 목록이 비었을 때 보여줄 문구.
 */
const ObstacleTable = ({
  obstacles,
  editable = false,
  shapes = [],
  shape = '',
  drawingShape = null,
  selectedId = null,
  editingId = null,
  onShapeChange,
  onDrawToggle,
  onSelect,
  onEditToggle,
  onDelete,
  onRestore,
  noData = ''
}) => {
  const { t } = useTranslation('semantic')
  const { t: tCommon } = useTranslation('common')

  const columns = [
    {
      name: t('columns.inUse'),
      cell: (row) => (row.editStatus?.inUsed ? <InUseBadge /> : null),
      grow: 0.2
    },
    {
      name: t('obstacleColumns.no'),
      cell: (_row, index) => index + 1,
      grow: 0.2
    },
    {
      name: t('obstacleColumns.shape'),
      // 형태 이름은 코드 값(RECTANGLE/POLYGON)이라 번역해서 보여준다. 점 개수를 함께 붙여
      // 좌표 칸을 다 읽지 않아도 몇 점짜리인지 알 수 있게 한다.
      cell: (row) =>
        `${t(`obstacleShapes.${row.shape ?? 'RECTANGLE'}`, row.shape ?? 'RECTANGLE')} (${obstaclePoints(row).length})`,
      grow: 0.5
    },
    {
      name: t('obstacleColumns.points'),
      // 두 형태를 같은 방식으로 보여준다 — 사각형도 네 꼭지점을 펼쳐 찍는다.
      cell: (row) => <ObstaclePointList points={obstaclePoints(row)} />,
      // 점이 많은 폴리곤은 한 줄에 담기지 않으므로 줄바꿈을 허용한다(기본은 말줄임).
      wrap: true,
      grow: 2
    },
    {
      name: t('columns.command'),
      // 행 클릭(선택)까지 함께 일어나면 어느 동작이 먹었는지 알 수 없으므로 전파를 막는다.
      cell: (row) =>
        editable ? (
          <RowCommands>
            {row.editStatus?.softDelete ? (
              <Button
                size="sm"
                onClick={(e) => {
                  e.stopPropagation()
                  onRestore(row.id)
                }}
              >
                {t('restore')}
              </Button>
            ) : (
              <>
                <Button
                  size="sm"
                  theme={row.id === editingId ? 'secondary' : 'primary'}
                  onClick={(e) => {
                    e.stopPropagation()
                    onEditToggle(row.id)
                  }}
                >
                  {row.id === editingId ? t('obstacleEditDone') : t('edit')}
                </Button>
                <Button
                  size="sm"
                  theme="delete"
                  onClick={(e) => {
                    e.stopPropagation()
                    onDelete(row.id)
                  }}
                >
                  {t('delete')}
                </Button>
              </>
            )}
          </RowCommands>
        ) : null,
      grow: 0.8
    }
  ]

  const conditionalRowStyles = useMemo(
    () => [
      {
        when: (row) => row.id != null && row.id === selectedId,
        style: { backgroundColor: SELECTED_ROW_BACKGROUND }
      }
    ],
    [selectedId]
  )

  return (
    <>
      {editable && (
        <ButtonWrapper>
          <CommandFilters>
            {/* 추가할 형태 — 사각형은 드래그 한 번, 폴리곤은 점을 하나씩 찍는다.
                그리는 중에는 잠근다: 도중에 형태가 바뀌면 찍어 둔 점이 버려진다. */}
            <Dropdown
              label={t('obstacleShape')}
              size="md"
              value={shape}
              options={shapes.map((value) => ({ name: t(`obstacleShapes.${value}`, value), value }))}
              onChange={onShapeChange}
              disabled={!!drawingShape}
            />
          </CommandFilters>
          <Button theme={drawingShape ? 'tertiary' : 'primary'} onClick={onDrawToggle}>
            {drawingShape ? tCommon('cancel') : t('obstacleCreate')}
          </Button>
        </ButtonWrapper>
      )}

      {/* 버튼만으로는 다음에 무엇을 해야 하는지 알 수 없다 — 지금 필요한 지도 조작을 알려준다.
          그리기와 꼭지점 편집은 함께 켜지지 않으므로 문구도 하나만 보인다. */}
      {drawingShape === POLYGON && <MetaText style={{ marginTop: '0.8rem' }}>{t('obstaclePolygonHint')}</MetaText>}
      {drawingShape && drawingShape !== POLYGON && (
        <MetaText style={{ marginTop: '0.8rem' }}>{t('obstacleDrawHint')}</MetaText>
      )}
      {!drawingShape && editingId != null && (
        <MetaText style={{ marginTop: '0.8rem' }}>{t('obstacleEditHint')}</MetaText>
      )}

      <Suspense fallback={<div>{t('loading')}</div>}>
        <div style={{ margin: '16px 0', fontSize: '14px', fontWeight: 'bold' }}>
          {tCommon('count')} : {obstacles.length}
        </div>

        <TableCard
          columns={columns}
          data={obstacles}
          noData={noData || t('noObstacles')}
          pagination
          paginationRowsPerPageOptions={[10, 30, 50, 100]}
          conditionalRowStyles={conditionalRowStyles}
          highlightOnHover
          pointerOnHover
          onRowClicked={(row) => onSelect(row.id)}
        />
      </Suspense>
    </>
  )
}

export default ObstacleTable
