import styled from 'styled-components'
import Badge from './Badge'
import { toArray } from '../../utils'
import { convertDateToString } from '@repo/utils'

const CellCenter = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;
  min-width: 0;
  cursor: pointer;
`

const CellLeft = styled.div`
  display: flex;
  align-items: center;
  width: 100%;
  height: 100%;
  min-width: 0;
  cursor: pointer;
`

const EllipsisText = styled.span`
  display: block;
  width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`

const FunctionBadgeText = styled.span`
  display: inline-block;
  align-items: center;
  justify-content: center;
  background: #edf1f5;
  color: #5f6b7c;
  border-radius: 6px;
  font-size: 11px;
  font-weight: 700;
  padding: 2px 6px;
  max-width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`

const SummaryText = styled.span`
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  display: block;
  width: 100%;
`

const ScoreText = styled(EllipsisText)`
  text-align: center;
`

const ActionCardList = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  justify-content: center;
`

const ActionCard = styled.button`
  border: 1px solid #c7d7fe;
  background: #e8f0ff;
  color: #1d4ed8;
  border-radius: 10px;
  font-size: 11px;
  font-weight: 700;
  padding: 4px 8px;
  cursor: pointer;
  max-width: 120px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;

  &:hover {
    background: #dbe8ff;
  }
`

export const getEventTableColumns = (onRecommendActionClick) => [
  {
    name: 'Event ID',
    sortable: true,
    width: '100px',
    minWidth: '100px',
    maxWidth: '100px',
    center: true,
    cell: (row) => (
      <CellCenter data-tag="allowRowEvents" title={row.id}>
        <EllipsisText data-tag="allowRowEvents">{row.id || '-'}</EllipsisText>
      </CellCenter>
    )
  },
  {
    name: 'Robot ID',
    selector: (row) => row.robotId,
    sortable: true,
    width: '100px',
    minWidth: '100px',
    maxWidth: '100px',
    center: true,
    cell: (row) => (
      <CellCenter data-tag="allowRowEvents" title={row.robotId}>
        <EllipsisText data-tag="allowRowEvents">{row.robotId || '-'}</EllipsisText>
      </CellCenter>
    )
  },
  {
    name: 'Function',
    selector: (row) => row.func,
    sortable: true,
    width: '120px',
    minWidth: '120px',
    maxWidth: '120px',
    center: true,
    cell: (row) => (
      <CellCenter data-tag="allowRowEvents" title={row.func}>
        <FunctionBadgeText data-tag="allowRowEvents">{row.func || '-'}</FunctionBadgeText>
      </CellCenter>
    )
  },
  {
    name: '분류 점수',
    sortable: true,
    width: '100px',
    minWidth: '100px',
    maxWidth: '100px',
    center: true,
    cell: (row) => {
      const score =
        typeof row?.confidence === 'number' ? row.confidence.toFixed(2) : '-'

      return (
        <CellCenter data-tag="allowRowEvents" title={score}>
          <ScoreText data-tag="allowRowEvents">{score}</ScoreText>
        </CellCenter>
      )
    }
  },
  {
    name: '요약',
    selector: (row) => row.summary,
    sortable: true,
    grow: 1,
    maxWidth: '600px',
    cell: (row) => (
      <CellLeft data-tag="allowRowEvents" title={row.summary}>
        <SummaryText data-tag="allowRowEvents">{row.summary || '-'}</SummaryText>
      </CellLeft>
    )
  },
  {
    name: '상태',
    selector: (row) => row.status,
    sortable: true,
    width: '150px',
    minWidth: '150px',
    maxWidth: '150px',
    center: true,
    cell: (row) => (
      <CellCenter data-tag="allowRowEvents">
        <div data-tag="allowRowEvents">
          <Badge kind="status" value={row.status} />
        </div>
      </CellCenter>
    )
  },
  {
    name: '심각도',
    selector: (row) => row.severity,
    sortable: true,
    width: '100px',
    minWidth: '100px',
    maxWidth: '100px',
    center: true,
    cell: (row) => (
      <CellCenter data-tag="allowRowEvents">
        <div data-tag="allowRowEvents">
          <Badge kind="severity" value={row.severity} />
        </div>
      </CellCenter>
    )
  },
  {
    name: '추천 Action',
    selector: (row) => row.action,
    sortable: true,
    width: '240px',
    minWidth: '240px',
    maxWidth: '240px',
    center: true,
    cell: (row) => {
      // 백엔드(event_analyzer)가 분석 완료 상태에서만 채워주는 실제 추천 액션을 사용한다.
      // 분석중/실패 등에서는 빈 배열이라 추천이 표시되지 않는다.
      const recommended = toArray(row?.actions).filter(Boolean)

      const eventId = row?.eventId ?? row?.id ?? null

      const handleClickAction = (e, action) => {
        e.stopPropagation()
        onRecommendActionClick?.(action)
      }

      if (recommended.length === 0) {
        return (
          <CellCenter data-tag="allowRowEvents">
            <div data-tag="allowRowEvents">
              <Badge kind="action" value={row.action} />
            </div>
          </CellCenter>
        )
      }

      return (
        <CellCenter data-tag="allowRowEvents">
          <ActionCardList data-tag="allowRowEvents">
            {recommended.map((item, index) => {
              const actionName = String(item?.name ?? item?.key ?? `Action ${index + 1}`).trim()
              const actionKey = String(item?.id ?? item?.key ?? `${row?.eventId ?? row?.id ?? ''}-${index}`)

              return (
                <ActionCard
                  key={actionKey}
                  type="button"
                  title={actionName}
                  onClick={(e) =>
                    handleClickAction(e, { eventId, key: item?.key, name: actionName })
                  }
                >
                  {actionName}
                </ActionCard>
              )
            })}
          </ActionCardList>
        </CellCenter>
      )
    }
  },
  {
    name: '발생 시간',
    selector: (row) => row.createdAt,
    sortable: true,
    width: '190px',
    minWidth: '190px',
    maxWidth: '190px',
    cell: (row) => (
      <CellCenter data-tag="allowRowEvents" title={convertDateToString(row.createdAt)}>
        <EllipsisText data-tag="allowRowEvents">{convertDateToString(row.createdAt)}</EllipsisText>
      </CellCenter>
    )
  }
]

export default getEventTableColumns
