import { useMemo } from 'react'
import { buildEventSummary } from '../utils'
import { SummaryGrid, SummaryCard, SummaryValue, SummaryLabel, SummaryUnit } from './eventSummaryCards.styles'

const EventSummaryCards = ({ rows = [], totalCount, summary }) => {
  const resolvedSummary = useMemo(() => {
    if (summary) {
      return {
        totalCount: Number(summary.totalCount ?? totalCount ?? 0),
        actionCompletedCount: Number(summary.actionCompletedCount ?? 0),
        analysisCompletedCount: Number(summary.analysisCompletedCount ?? 0),
        analysisFailedCount: Number(summary.analysisFailedCount ?? 0),
        severityCriticalCount: Number(summary.severityCriticalCount ?? 0),
        severityHighCount: Number(summary.severityHighCount ?? 0),
        severityMiddleCount: Number(summary.severityMiddleCount ?? 0),
        severityLowCount: Number(summary.severityLowCount ?? 0)
      }
    }

    return buildEventSummary(rows, totalCount)
  }, [rows, summary, totalCount])

  return (
    <SummaryGrid>
      <SummaryCard>
        <SummaryLabel>총 이벤트</SummaryLabel>
        <SummaryValue>
          {resolvedSummary.totalCount}
          <SummaryUnit>건</SummaryUnit>
        </SummaryValue>
      </SummaryCard>

      <SummaryCard>
        <SummaryLabel>조치 완료</SummaryLabel>
        <SummaryValue>
          {resolvedSummary.actionCompletedCount}
          <SummaryUnit>건</SummaryUnit>
        </SummaryValue>
      </SummaryCard>

      <SummaryCard>
        <SummaryLabel>분석 완료</SummaryLabel>
        <SummaryValue>
          {resolvedSummary.analysisCompletedCount}
          <SummaryUnit>건</SummaryUnit>
        </SummaryValue>
      </SummaryCard>

      <SummaryCard>
        <SummaryLabel>분석 실패</SummaryLabel>
        <SummaryValue>
          {resolvedSummary.analysisFailedCount}
          <SummaryUnit>건</SummaryUnit>
        </SummaryValue>
      </SummaryCard>

      <SummaryCard $tone="critical">
        <SummaryLabel>Critical</SummaryLabel>
        <SummaryValue $tone="critical">
          {resolvedSummary.severityCriticalCount}
          <SummaryUnit>건</SummaryUnit>
        </SummaryValue>
      </SummaryCard>

      <SummaryCard $tone="high">
        <SummaryLabel>High</SummaryLabel>
        <SummaryValue $tone="high">
          {resolvedSummary.severityHighCount}
          <SummaryUnit>건</SummaryUnit>
        </SummaryValue>
      </SummaryCard>

      <SummaryCard $tone="medium">
        <SummaryLabel>Medium</SummaryLabel>
        <SummaryValue $tone="medium">
          {resolvedSummary.severityMiddleCount}
          <SummaryUnit>건</SummaryUnit>
        </SummaryValue>
      </SummaryCard>

      <SummaryCard $tone="low">
        <SummaryLabel>Low</SummaryLabel>
        <SummaryValue $tone="low">
          {resolvedSummary.severityLowCount}
          <SummaryUnit>건</SummaryUnit>
        </SummaryValue>
      </SummaryCard>
    </SummaryGrid>
  )
}

export default EventSummaryCards
