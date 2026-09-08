import { Suspense, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { Button, Dropdown, Icon, TableCard } from '@repo/ui'
import { CommandFilters, MetaText, ObstacleCommandRow, RowCommands } from './styles'
import ObstaclePointList from './ObstaclePoints'

// 선택된 행의 배경 — 지도에서 강조하는 도형과 같은 붉은 계열로 두어 목록과 지도가
// 같은 것을 가리킨다는 것이 한눈에 보이게 한다(MapCanvas 의 OBSTACLE_SELECTED_FILL).
const SELECTED_ROW_BACKGROUND = 'rgba(231, 76, 60, 0.1)'

/** 목록에 보여줄 꼭지점들 — 모든 형태가 순서 있는 points 하나로 저장된다. */
const obstaclePoints = (obstacle) => (Array.isArray(obstacle?.points) ? obstacle.points : [])

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
 * 가상 장애물 목록.
 *
 * 지도에서 그린 도형(점/선분/사각형/폴리곤)을 타입·이름·좌표와 함께 보여주고, 작업본(WORKING)에서
 * 모양 수정과 삭제를 할 수 있다.
 * 행을 누르면 그 도형이 지도에서 강조되고, 수정을 누르면 지도의 꼭지점 손잡이로 모양을 고친다.
 * 삭제는 POI 와 같이 삭제 예정 표시이고 임시 저장 전까지 되돌릴 수 있다.
 *
 * 상단 줄은 타입 필터 + 추가 버튼뿐이다. 설정 순서가
 *   추가 버튼 → (지도 위) 형태 선택 → 좌표 지정 → 모달에서 타입/이름
 * 이므로, 형태 선택과 그리기 안내는 지도 위 조작 줄(MapCanvas)이 맡고 새 도형의 타입/이름은
 * 좌표 지정을 마친 직후 모달이 받는다(SemanticPage 의 pendingObstacle).
 * 그래서 여기의 타입 드롭다운은 입력이 아니라 목록/지도 필터다.
 *
 * @param {Array} obstacles { id, obsId, type, name, shape, points, editStatus } 목록(필터 적용됨).
 * @param {boolean} [editable] 편집 가능 여부 — 작업본(WORKING)일 때만 true.
 *   false 면 추가/수정/삭제 버튼을 노출하지 않는다(IN-USE 는 저장된 결과를 보는 화면).
 *   타입 필터는 조회에도 필요하므로 이 값과 무관하게 계속 보인다.
 * @param {boolean} [addDisabled] 추가만 잠글지 — 지원 타입 목록을 아직 모르거나 받지 못한 경우.
 *   수정/삭제는 그대로 열어 둔다(이미 있는 것을 고치는 데는 타입 목록이 필요 없다).
 * @param {string|null} [drawingShape] 지금 지도에서 그리는 중인 형태 — null 이면 그리지 않는 중.
 *   추가 버튼의 문구/색(추가 ↔ 취소)에만 쓴다.
 * @param {number[]} [types] 필터로 고를 수 있는 장애물 타입(정수 enum) 목록.
 * @param {number|string} [typeFilter] 지금 걸린 타입 필터 — filterAllValue 면 전체.
 * @param {string} [filterAllValue] '전체' 를 뜻하는 값.
 * @param {number} [totalCount] 필터 적용 전 전체 개수 — 필터가 걸렸을 때 함께 보여준다.
 * @param {string|number|null} selectedId 지도에서 강조 중인 장애물 id.
 * @param {string|number|null} editingId 꼭지점으로 모양을 고치는 중인 장애물 id.
 * @param {Function} onTypeFilterChange (value) => void — 타입 필터 변경.
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
  addDisabled = false,
  drawingShape = null,
  types = [],
  typeFilter = 'ALL',
  filterAllValue = 'ALL',
  totalCount = 0,
  selectedId = null,
  editingId = null,
  onTypeFilterChange,
  onDrawToggle,
  onSelect,
  onEditToggle,
  onDelete,
  onRestore,
  noData = ''
}) => {
  const { t } = useTranslation('semantic')
  const { t: tCommon } = useTranslation('common')

  /** 타입 이름 — 로봇과 약속된 정수라 번역이 없으면 숫자를 그대로 보여준다. */
  const typeLabel = (value) => t(`obstacleTypes.${value}`, String(value ?? ''))

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
      // 로봇 쪽 식별 키는 [type, obsId] 라 둘을 한 칸에 붙여 보여준다.
      // obsId 는 BE 가 저장 시 타입별로 발급하므로 미저장 행은 비어 있다.
      name: t('obstacleColumns.type'),
      cell: (row) => `${typeLabel(row.type)}${row.obsId != null ? ` #${row.obsId}` : ''}`,
      grow: 0.7
    },
    {
      name: t('obstacleColumns.name'),
      cell: (row) => row.name || '',
      grow: 0.6
    },
    {
      name: t('obstacleColumns.shape'),
      // 형태 이름은 코드 값(POINT/LINE/RECTANGLE/POLYGON)이라 번역해서 보여준다. 점 개수를 함께
      // 붙여 좌표 칸을 다 읽지 않아도 몇 점짜리인지 알 수 있게 한다.
      cell: (row) =>
        `${t(`obstacleShapes.${row.shape ?? 'RECTANGLE'}`, row.shape ?? 'RECTANGLE')} (${obstaclePoints(row).length})`,
      grow: 0.5
    },
    {
      name: t('obstacleColumns.points'),
      // 네 형태를 같은 방식으로 보여준다 — 저장된 점 순서를 그대로 찍는다.
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
      <ObstacleCommandRow>
        <CommandFilters>
          {/* 타입 필터 — 목록과 지도에 같이 걸린다. 새 도형의 타입은 그리기를 마친 뒤 모달이 받는다.
              조회(IN-USE)에서도 필요하므로 editable 과 무관하게 노출한다. */}
          <Dropdown
            label={t('obstacleTypeFilter')}
            size="md"
            value={typeFilter}
            options={[
              { name: tCommon('all'), value: filterAllValue },
              ...types.map((value) => ({ name: t(`obstacleTypes.${value}`, String(value)), value }))
            ]}
            onChange={onTypeFilterChange}
          />
        </CommandFilters>
        {editable && (
          <Button
            size="md"
            theme={drawingShape ? 'tertiary' : 'primary'}
            onClick={onDrawToggle}
            disabled={addDisabled && !drawingShape}
            title={addDisabled ? t('obstacleTypesUnavailable') : undefined}
          >
            {drawingShape ? tCommon('cancel') : t('obstacleCreate')}
          </Button>
        )}
      </ObstacleCommandRow>

      {/* 추가가 잠긴 이유를 알려준다 — 버튼만 회색이면 화면이 고장 난 것으로 보인다. */}
      {editable && addDisabled && (
        <MetaText style={{ marginTop: '0.8rem' }}>{t('obstacleTypesUnavailable')}</MetaText>
      )}

      {/* 그리는 중 안내는 지도 위 조작 줄이 맡는다(형태 선택과 같은 자리에 있어야 읽힌다).
          여기 남는 것은 꼭지점 편집 안내뿐이다 — 그리기와 함께 켜지지 않으므로 겹치지 않는다. */}
      {!drawingShape && editingId != null && (
        <MetaText style={{ marginTop: '0.8rem' }}>{t('obstacleEditHint')}</MetaText>
      )}

      <Suspense fallback={<div>{t('loading')}</div>}>
        {/* 필터가 걸려 있으면 개수가 전체와 달라진다 — 저장 대상은 전체이므로 둘을 같이 보여준다
            (필터 상태에서 "이것만 저장된다" 로 읽히면 안 된다). */}
        <div style={{ margin: '16px 0', fontSize: '14px', fontWeight: 'bold' }}>
          {tCommon('count')} : {obstacles.length}
          {typeFilter !== filterAllValue && ` / ${tCommon('all')} ${totalCount}`}
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
