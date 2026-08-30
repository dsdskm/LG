import { useState, useEffect, useCallback } from 'react'
import styled, { keyframes, css } from 'styled-components'
import { useTranslation } from 'react-i18next'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, Legend,
  ResponsiveContainer
} from 'recharts'
import { getLearningOverview } from '../apis/overviewMockData'

const TIME_RANGE_KEYS = ['1h', '24h', '7d', '30d']

// ─────────────────────────────────────────────────────────────────────────────
// Styled components
// ─────────────────────────────────────────────────────────────────────────────
const Page = styled.div`
  padding: 28px 32px;
  display: flex;
  flex-direction: column;
  gap: 20px;
`

const PageHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 12px;
`

const TitleRow = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
`

const PageTitle = styled.h1`
  font-size: 20px;
  font-weight: 700;
  color: #1e293b;
  margin: 0;
`

const pulse = keyframes`
  0%, 100% { opacity: 1; }
  50%       { opacity: 0.45; }
`

const LiveBadge = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 5px;
  background: #dcfce7;
  color: #16a34a;
  font-size: 11px;
  font-weight: 700;
  padding: 3px 8px;
  border-radius: 20px;

  &::before {
    content: '';
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: #22c55e;
    animation: ${pulse} 1.4s infinite;
  }
`

const UpdateTime = styled.span`
  font-size: 12px;
  color: #94a3b8;
`

const Controls = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
`

const RangeBtnGroup = styled.div`
  display: flex;
  background: #f1f5f9;
  border-radius: 8px;
  padding: 3px;
  gap: 2px;
`

const RangeBtn = styled.button`
  padding: 5px 12px;
  border-radius: 6px;
  font-size: 12px;
  font-weight: 600;
  border: none;
  cursor: pointer;
  transition: all 0.15s;

  ${({ $active }) =>
    $active
      ? css`background: #fff; color: #1e293b; box-shadow: 0 1px 3px rgba(0,0,0,0.12);`
      : css`background: transparent; color: #64748b; &:hover { color: #1e293b; }`}
`

const RefreshBtn = styled.button`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 30px;
  height: 30px;
  border-radius: 6px;
  border: 1px solid #e2e8f0;
  background: #fff;
  color: #64748b;
  font-size: 15px;
  cursor: pointer;
  transition: background 0.15s;

  &:hover { background: #f8fafc; color: #334155; }
`

const StatCards = styled.div`
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 14px;

  @media (max-width: 900px) { grid-template-columns: 1fr; }
`

const StatCard = styled.div`
  background: #fff;
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  padding: 18px 22px;
  display: flex;
  flex-direction: column;
  gap: 6px;
`

const StatLabel = styled.div`
  font-size: 13px;
  font-weight: 600;
  color: #64748b;
`

const StatBottom = styled.div`
  display: flex;
  align-items: baseline;
  justify-content: space-between;
`

const StatDelta = styled.span`
  font-size: 12px;
  font-weight: 600;
  color: ${({ $positive }) => ($positive ? '#16a34a' : '#dc2626')};
`

const StatValue = styled.div`
  font-size: 36px;
  font-weight: 800;
  color: #1e293b;
  line-height: 1;
`

const StatUnit = styled.span`
  font-size: 16px;
  font-weight: 600;
  color: #64748b;
  margin-left: 3px;
`

const SectionCard = styled.div`
  background: #fff;
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  padding: 18px 22px;
`

const SectionHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 14px;
`

const SectionTitle = styled.div`
  font-size: 14px;
  font-weight: 700;
  color: #1e293b;
`

const LinkBtn = styled.button`
  font-size: 12px;
  font-weight: 600;
  color: #6366f1;
  background: none;
  border: none;
  cursor: pointer;
  padding: 0;

  &:hover { text-decoration: underline; }
`

const PipelineRow = styled.div`
  display: flex;
  align-items: center;
  overflow-x: auto;
`

const PipelineStage = styled.div`
  flex: 1;
  min-width: 90px;
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  padding: 10px 14px;
  text-align: center;
`

const StageName = styled.div`
  font-size: 12px;
  color: #64748b;
  font-weight: 500;
  margin-bottom: 4px;
`

const StageCount = styled.div`
  font-size: 22px;
  font-weight: 700;
  color: #1e293b;
`

const PipelineArrow = styled.div`
  color: #cbd5e1;
  font-size: 13px;
  flex-shrink: 0;
  padding: 0 8px;
`

const OtaCards = styled.div`
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 12px;

  @media (max-width: 700px) { grid-template-columns: repeat(2, 1fr); }
`

const OtaCard = styled.div`
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  padding: 14px 16px;
  text-align: center;
`

const OtaLabel = styled.div`
  font-size: 12px;
  color: #64748b;
  font-weight: 500;
  margin-bottom: 6px;
`

const OtaValue = styled.div`
  font-size: 24px;
  font-weight: 700;
  color: #1e293b;
`

const Table = styled.table`
  width: 100%;
  border-collapse: collapse;
  font-size: 13px;
`

const Th = styled.th`
  text-align: left;
  padding: 8px 12px;
  font-size: 12px;
  font-weight: 600;
  color: #64748b;
  border-bottom: 1px solid #f1f5f9;
  white-space: nowrap;

  &:last-child { text-align: center; }
`

const Td = styled.td`
  padding: 10px 12px;
  color: #334155;
  border-bottom: 1px solid #f8fafc;

  &:last-child { text-align: center; }
`

const RunningBadge = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 5px;
  background: #dbeafe;
  color: #1d4ed8;
  font-size: 11px;
  font-weight: 700;
  padding: 3px 10px;
  border-radius: 20px;

  &::before {
    content: '';
    width: 5px;
    height: 5px;
    border-radius: 50%;
    background: #3b82f6;
  }
`

const DownloadLink = styled.button`
  font-size: 12px;
  font-weight: 600;
  color: #6366f1;
  background: none;
  border: none;
  cursor: pointer;
  padding: 0;

  &:hover { text-decoration: underline; }
`

const SortIcon = styled.span`
  margin-left: 4px;
  color: #cbd5e1;
  font-size: 10px;
`

const ChartTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null
  return (
    <div style={{
      background: '#1e293b', color: '#fff', borderRadius: 8,
      padding: '8px 12px', fontSize: 12, boxShadow: '0 4px 12px rgba(0,0,0,0.18)',
      pointerEvents: 'none', lineHeight: 1.6
    }}>
      <div style={{ fontWeight: 700, marginBottom: 4 }}>{label}</div>
      {payload.map((p) => (
        <div key={p.dataKey} style={{ color: p.fill === '#3b82f6' ? '#93c5fd' : '#cbd5e1' }}>
          {p.name}: {p.value.toLocaleString()}
        </div>
      ))}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────────────────────
export default function LearningOverviewPage() {
  const { t } = useTranslation('learn')
  const [range, setRange] = useState('24h')
  const [data, setData] = useState(null)
  const [refreshKey, setRefreshKey] = useState(0)

  const load = useCallback(() => {
    getLearningOverview(range).then(setData).catch(console.error)
  }, [range])

  useEffect(() => { load() }, [load, refreshKey])

  if (!data) return null

  const { lastUpdated, stats, pipeline, otaDeployment, topRunning, taskProgress } = data
  const chartHeight = Math.max(300, taskProgress.length * 28)

  return (
    <Page>
      {/* ── Header ── */}
      <PageHeader>
        <TitleRow>
          <PageTitle>{t('overview.title')}</PageTitle>
          <LiveBadge>{t('overview.liveLabel')}</LiveBadge>
          <UpdateTime>{t('overview.lastUpdated')} {lastUpdated}</UpdateTime>
        </TitleRow>
        <Controls>
          <RangeBtnGroup>
            {TIME_RANGE_KEYS.map((key) => (
              <RangeBtn key={key} $active={range === key} onClick={() => setRange(key)}>
                {t(`overview.timeRange.${key}`)}
              </RangeBtn>
            ))}
          </RangeBtnGroup>
          <RefreshBtn title={t('overview.refresh')} onClick={() => setRefreshKey((k) => k + 1)}>↻</RefreshBtn>
        </Controls>
      </PageHeader>

      {/* ── Stat cards ── */}
      <StatCards>
        <StatCard>
          <StatLabel>{t('overview.stat.successRate')}</StatLabel>
          <StatBottom>
            <StatDelta $positive={stats.successRate.positive}>
              {t('overview.stat.deltaPrefix')}{stats.successRate.delta}{stats.successRate.deltaUnit}
            </StatDelta>
            <StatValue>{stats.successRate.current}<StatUnit>%</StatUnit></StatValue>
          </StatBottom>
        </StatCard>
        <StatCard>
          <StatLabel>{t('overview.stat.totalCases')}</StatLabel>
          <StatBottom>
            <StatDelta $positive={stats.totalCases.positive}>
              {t('overview.stat.deltaPrefix')}{stats.totalCases.delta}{stats.totalCases.deltaUnit}
            </StatDelta>
            <StatValue>{stats.totalCases.current}</StatValue>
          </StatBottom>
        </StatCard>
        <StatCard>
          <StatLabel>{t('overview.stat.needRetraining')}</StatLabel>
          <StatBottom>
            <StatDelta $positive={stats.needRetraining.positive}>
              {t('overview.stat.deltaPrefix')}{stats.needRetraining.delta}{stats.needRetraining.deltaUnit}
            </StatDelta>
            <StatValue>{stats.needRetraining.current}</StatValue>
          </StatBottom>
        </StatCard>
      </StatCards>

      {/* ── Pipeline ── */}
      <SectionCard>
        <SectionHeader>
          <SectionTitle>{t('overview.pipeline.title')}</SectionTitle>
        </SectionHeader>
        <PipelineRow>
          {pipeline.map((stage, i) => (
            <>
              <PipelineStage key={stage.name}>
                <StageName>{stage.name}</StageName>
                <StageCount>{stage.count}</StageCount>
              </PipelineStage>
              {i < pipeline.length - 1 && <PipelineArrow key={`arrow-${i}`}>▶</PipelineArrow>}
            </>
          ))}
        </PipelineRow>
      </SectionCard>

      {/* ── OTA deployment ── */}
      <SectionCard>
        <SectionHeader>
          <SectionTitle>{t('overview.ota.title')}</SectionTitle>
          <LinkBtn type="button" onClick={() => { window.location.href = '/ota' }}>
            {t('overview.ota.goTo')}
          </LinkBtn>
        </SectionHeader>
        <OtaCards>
          <OtaCard>
            <OtaLabel>{t('overview.ota.total')}</OtaLabel>
            <OtaValue>{otaDeployment.total}</OtaValue>
          </OtaCard>
          <OtaCard>
            <OtaLabel>{t('overview.ota.before')}</OtaLabel>
            <OtaValue>{otaDeployment.before}</OtaValue>
          </OtaCard>
          <OtaCard>
            <OtaLabel>{t('overview.ota.deploying')}</OtaLabel>
            <OtaValue>{otaDeployment.deploying}</OtaValue>
          </OtaCard>
          <OtaCard>
            <OtaLabel>{t('overview.ota.completed')}</OtaLabel>
            <OtaValue>{otaDeployment.completed}</OtaValue>
          </OtaCard>
        </OtaCards>
      </SectionCard>

      {/* ── Top running table ── */}
      <SectionCard>
        <SectionHeader>
          <SectionTitle>{t('overview.topRunning.title')}</SectionTitle>
          <LinkBtn type="button" onClick={() => { window.location.href = '/robot/management' }}>
            {t('overview.topRunning.goToRobot')}
          </LinkBtn>
        </SectionHeader>
        <Table>
          <thead>
            <tr>
              <Th>{t('overview.topRunning.colTaskStatus')}<SortIcon>⇅</SortIcon></Th>
              <Th>{t('overview.topRunning.colTask')}<SortIcon>⇅</SortIcon></Th>
              <Th>{t('overview.topRunning.colType')}<SortIcon>⇅</SortIcon></Th>
              <Th>{t('overview.topRunning.colRobotId')}<SortIcon>⇅</SortIcon></Th>
              <Th>{t('overview.topRunning.colSuccessRate')}<SortIcon>⇅</SortIcon></Th>
              <Th>{t('overview.topRunning.colDownload')}</Th>
            </tr>
          </thead>
          <tbody>
            {topRunning.map((row, i) => (
              <tr key={`${row.robotId}-${i}`}>
                <Td><RunningBadge>{t('overview.topRunning.running')}</RunningBadge></Td>
                <Td style={{ fontWeight: 500 }}>{row.task}</Td>
                <Td style={{ color: '#64748b' }}>{row.type}</Td>
                <Td style={{ fontFamily: 'monospace', fontSize: 12 }}>{row.robotId}</Td>
                <Td style={{ color: '#16a34a', fontWeight: 600 }}>{row.successRate}%</Td>
                <Td><DownloadLink type="button">{t('overview.topRunning.downloadBtn')}</DownloadLink></Td>
              </tr>
            ))}
          </tbody>
        </Table>
      </SectionCard>

      {/* ── Task Progress (horizontal bar) ── */}
      <SectionCard>
        <SectionHeader>
          <SectionTitle>{t('overview.taskProgress.title')}</SectionTitle>
        </SectionHeader>
        <ResponsiveContainer width="100%" height={chartHeight}>
          <BarChart
            data={taskProgress}
            layout="vertical"
            margin={{ top: 0, right: 20, bottom: 0, left: 140 }}
            barCategoryGap="30%"
          >
            <XAxis type="number" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
            <YAxis
              type="category"
              dataKey="task"
              tick={{ fontSize: 11, fill: '#64748b' }}
              axisLine={false}
              tickLine={false}
              width={135}
            />
            <Tooltip content={<ChartTooltip />} cursor={{ fill: 'rgba(99,102,241,0.06)' }} />
            <Legend
              verticalAlign="top"
              align="center"
              iconType="square"
              iconSize={10}
              formatter={(value) => (
                <span style={{ fontSize: 12, color: '#64748b', fontWeight: 600 }}>
                  {value === 'collected' ? t('overview.taskProgress.collected') : t('overview.taskProgress.remaining')}
                </span>
              )}
            />
            <Bar dataKey="collected" stackId="a" fill="#3b82f6" radius={[0, 0, 0, 0]} />
            <Bar dataKey="remaining" stackId="a" fill="#e2e8f0" radius={[0, 2, 2, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </SectionCard>
    </Page>
  )
}
