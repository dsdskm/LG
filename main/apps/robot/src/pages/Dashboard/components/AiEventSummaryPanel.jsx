import React, { useEffect, useState } from 'react'
import styled from 'styled-components'
import { DashSection } from './../styles'
import { Icon } from '@repo/ui'
import { getQueryLogs } from '@/apis/ai/aiApis'
import { buildEventSummary } from '../../AiLogManagement/EventManagement/EventTablePanel/utils'

const SUMMARY_FETCH_LIMIT = 100000

const pad2 = (value) => String(value).padStart(2, '0')

const getTodayString = () => {
  const now = new Date()
  return `${now.getFullYear()}-${pad2(now.getMonth() + 1)}-${pad2(now.getDate())}`
}

const getListItems = (response) => {
  if (Array.isArray(response)) return response
  if (Array.isArray(response?.items)) return response.items
  if (Array.isArray(response?.data)) return response.data
  if (Array.isArray(response?.data?.items)) return response.data.items
  if (Array.isArray(response?.list)) return response.list
  return []
}

const getPageInfo = (response) => {
  if (response?.pageInfo) return response.pageInfo
  if (response?.data?.pageInfo) return response.data.pageInfo
  return {}
}

const EMPTY_SUMMARY = buildEventSummary([], 0)

const SUMMARY_TONE_MAP = {
  default: {
    background: 'linear-gradient(197.77deg, #fffeff 18.23%, #f1f8ff 84.66%)',
    borderColor: 'rgba(172, 173, 188, 0.3)',
    valueColor: '#0f172a'
  },
  critical: {
    background: 'linear-gradient(197.77deg, #fff5f5 18.23%, #ffe5e5 84.66%)',
    borderColor: '#ffb3b3',
    valueColor: '#e60000'
  },
  high: {
    background: 'linear-gradient(197.77deg, #fff8f5 18.23%, #fff0eb 84.66%)',
    borderColor: '#ffccbc',
    valueColor: '#d84315'
  },
  medium: {
    background: 'linear-gradient(197.77deg, #fffaf2 18.23%, #fff3dd 84.66%)',
    borderColor: '#ffe0b2',
    valueColor: '#fb8c00'
  },
  low: {
    background: 'linear-gradient(197.77deg, #fffef4 18.23%, #fff9db 84.66%)',
    borderColor: '#fff59d',
    valueColor: '#f9a825'
  }
}

const Wrapper = styled(DashSection)`
  margin-bottom: 20px;
`

const HeaderRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 1.3rem;
`

const TitleGroup = styled.div`
  display: flex;
  align-items: baseline;
  gap: 8px;
  min-width: 0;
`

const SectionTitle = styled.h3`
  --tw-text-opacity: 1;
  color: rgb(44 45 56 / var(--tw-text-opacity));
  font-weight: 700;
  font-size: 1.6rem;
  margin: 0;
`

const TitleDate = styled.span`
  font-size: 1.2rem;
  font-weight: 600;
  color: #94a3b8;
  white-space: nowrap;
`

const ViewAllButton = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 0;
  border: 0;
  background: transparent;
  color: #64748b;
  font-size: 1.2rem;
  line-height: 1;
  font-weight: 600;
  cursor: pointer;
  white-space: nowrap;

  &:hover {
    color: #334155;
  }
`

const SummaryPanel = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
`

const GroupLabel = styled.div`
  font-size: 11px;
  font-weight: 700;
  color: #94a3b8;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  margin-top: 4px;
`

const StatusGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 8px;
`

const SeverityGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 8px;
`

const SummaryCard = styled.div`
  min-width: 0;
  padding: 10px 12px;
  border-radius: 10px;
  border: 1px solid
    ${({ $tone = 'default' }) => SUMMARY_TONE_MAP[$tone]?.borderColor || SUMMARY_TONE_MAP.default.borderColor};
  background: ${({ $tone = 'default' }) => SUMMARY_TONE_MAP[$tone]?.background || SUMMARY_TONE_MAP.default.background};
  box-shadow: 0 0 15px 0 rgba(173, 173, 173, 0.2);
  display: flex;
  flex-direction: column;
  gap: 6px;
`

const SummaryLabel = styled.div`
  font-size: 11px;
  line-height: 1.3;
  font-weight: 600;
  color: #64748b;
`

const SummaryValue = styled.div`
  display: flex;
  align-items: flex-end;
  font-size: 1.8rem;
  line-height: 1;
  font-weight: 700;
  letter-spacing: -0.02em;
  color: ${({ $tone = 'default' }) => SUMMARY_TONE_MAP[$tone]?.valueColor || SUMMARY_TONE_MAP.default.valueColor};
  white-space: nowrap;
`

const SummaryUnit = styled.span`
  font-size: 11px;
  line-height: 1;
  font-weight: 600;
  color: #64748b;
  margin-left: 3px;
`

const Divider = styled.div`
  border: none;
  border-top: 1px solid #f1f5f9;
  margin: 2px 0;
`

const EventSummaryPanel = ({ title = 'AI 이벤트 요약' }) => {
  const [today] = useState(getTodayString)
  const [summary, setSummary] = useState(EMPTY_SUMMARY)

  useEffect(() => {
    let isMounted = true

    const loadTodaySummary = async () => {
      try {
        const response = await getQueryLogs({
          start: today,
          end: today,
          startIndex: 0,
          count: SUMMARY_FETCH_LIMIT
        })

        if (!isMounted) return

        const items = getListItems(response)
        const pageInfo = getPageInfo(response)
        const totalCount = Number(pageInfo?.totalCount ?? pageInfo?.total ?? pageInfo?.allCount) || items.length

        setSummary(buildEventSummary(items, totalCount))
      } catch (error) {
        if (!isMounted) return
        console.error('Error loading AI event summary:', error)
        setSummary(EMPTY_SUMMARY)
      }
    }

    loadTodaySummary()

    return () => {
      isMounted = false
    }
  }, [today])

  const safeSummary = {
    totalCount: Number(summary?.totalCount ?? 0),
    actionCompletedCount: Number(summary?.actionCompletedCount ?? 0),
    analysisCompletedCount: Number(summary?.analysisCompletedCount ?? 0),
    analysisFailedCount: Number(summary?.analysisFailedCount ?? 0),
    severityCriticalCount: Number(summary?.severityCriticalCount ?? 0),
    severityHighCount: Number(summary?.severityHighCount ?? 0),
    severityMiddleCount: Number(summary?.severityMiddleCount ?? 0),
    severityLowCount: Number(summary?.severityLowCount ?? 0)
  }

  const handleClickViewAll = () => {
    window.location.href = 'http://localhost:5173/robot/ailog'
  }

  return (
    <Wrapper>
      <HeaderRow>
        <TitleGroup>
          <SectionTitle>{title}</SectionTitle>
          <TitleDate>{today} 기준</TitleDate>
        </TitleGroup>

        <ViewAllButton type="button" onClick={handleClickViewAll}>
          전체 이벤트 보기
          <Icon name="arrow_right" color="currentColor" size={16} />
        </ViewAllButton>
      </HeaderRow>

      <SummaryPanel>
        <GroupLabel>처리 현황</GroupLabel>
        <StatusGrid>
          <SummaryCard>
            <SummaryLabel>총 이벤트</SummaryLabel>
            <SummaryValue>
              {safeSummary.totalCount}
              <SummaryUnit>건</SummaryUnit>
            </SummaryValue>
          </SummaryCard>

          <SummaryCard>
            <SummaryLabel>조치 완료</SummaryLabel>
            <SummaryValue>
              {safeSummary.actionCompletedCount}
              <SummaryUnit>건</SummaryUnit>
            </SummaryValue>
          </SummaryCard>

          <SummaryCard>
            <SummaryLabel>분석 완료</SummaryLabel>
            <SummaryValue>
              {safeSummary.analysisCompletedCount}
              <SummaryUnit>건</SummaryUnit>
            </SummaryValue>
          </SummaryCard>

          <SummaryCard>
            <SummaryLabel>분석 실패</SummaryLabel>
            <SummaryValue>
              {safeSummary.analysisFailedCount}
              <SummaryUnit>건</SummaryUnit>
            </SummaryValue>
          </SummaryCard>
        </StatusGrid>

        <Divider />

        <GroupLabel>심각도별</GroupLabel>
        <SeverityGrid>
          <SummaryCard $tone="critical">
            <SummaryLabel>Critical</SummaryLabel>
            <SummaryValue $tone="critical">
              {safeSummary.severityCriticalCount}
              <SummaryUnit>건</SummaryUnit>
            </SummaryValue>
          </SummaryCard>

          <SummaryCard $tone="high">
            <SummaryLabel>High</SummaryLabel>
            <SummaryValue $tone="high">
              {safeSummary.severityHighCount}
              <SummaryUnit>건</SummaryUnit>
            </SummaryValue>
          </SummaryCard>

          <SummaryCard $tone="medium">
            <SummaryLabel>Medium</SummaryLabel>
            <SummaryValue $tone="medium">
              {safeSummary.severityMiddleCount}
              <SummaryUnit>건</SummaryUnit>
            </SummaryValue>
          </SummaryCard>

          <SummaryCard $tone="low">
            <SummaryLabel>Low</SummaryLabel>
            <SummaryValue $tone="low">
              {safeSummary.severityLowCount}
              <SummaryUnit>건</SummaryUnit>
            </SummaryValue>
          </SummaryCard>
        </SeverityGrid>
      </SummaryPanel>
    </Wrapper>
  )
}

export default EventSummaryPanel
