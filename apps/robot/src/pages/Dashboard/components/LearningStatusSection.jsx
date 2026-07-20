import React, { useState, useEffect, useCallback, useRef } from 'react'
import forgeLogoSvg from '@/assets/image/svg/PhysicalWorksForge.svg?raw'
import styled from 'styled-components'
import { useTranslation } from 'react-i18next'
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  BarChart,
  Bar,
  XAxis,
  AreaChart,
  Area
} from 'recharts'

// Measures its own box and renders the chart with explicit pixel size only when
// > 0. Avoids Recharts' ResponsiveContainer width(-1)/height(-1) warning when the
// section is collapsed (max-height:0) or measured before layout.
function AutoSize({ children }) {
  const ref = useRef(null)
  const [size, setSize] = useState({ w: 0, h: 0 })
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const ro = new ResizeObserver((entries) => {
      const cr = entries[0].contentRect
      setSize({ w: Math.floor(cr.width), h: Math.floor(cr.height) })
    })
    ro.observe(el)
    return () => ro.disconnect()
  }, [])
  return (
    <div ref={ref} style={{ position: 'absolute', inset: 0 }}>
      {size.w > 0 && size.h > 0 ? children(size.w, size.h) : null}
    </div>
  )
}
import { getLearningStats } from '@/apis/learning/learningApis'

// ── Collapsible shell ───────────────────────────────────────────

const SectionWrapper = styled.div`
  margin-top: 16px;
`

const SectionHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  cursor: pointer;
  user-select: none;
  margin-bottom: ${({ $collapsed }) => ($collapsed ? '0' : '12px')};
`

const SectionTitle = styled.h3`
  color: rgb(44 45 56);
  font-weight: 700;
  font-size: 1.6rem;
  margin: 0;
`

const CollapseBtn = styled.button`
  background: none;
  border: none;
  cursor: pointer;
  padding: 3px 10px;
  border-radius: 6px;
  color: #64748b;
  font-size: 1.2rem;
  font-weight: 500;
  display: flex;
  align-items: center;
  gap: 4px;
  transition: background 0.15s;

  &:hover {
    background: #f1f5f9;
  }
`

const Chevron = styled.span`
  display: inline-block;
  font-size: 1.2rem;
  line-height: 1;
  transition: transform 0.2s ease;
  transform: ${({ $collapsed }) => ($collapsed ? 'rotate(-90deg)' : 'rotate(0deg)')};
`

const HeaderRight = styled.div`
  display: flex;
  align-items: center;
  gap: 6px;
`

const UpdateTimeText = styled.span`
  font-size: 1.1rem;
  color: #94a3b8;
  font-weight: 400;
  white-space: nowrap;
`

const RefreshIconBtn = styled.button`
  background: none;
  border: 1px solid #e2e8f0;
  border-radius: 6px;
  padding: 2px 7px;
  color: #64748b;
  font-size: 1.3rem;
  line-height: 1;
  cursor: pointer;
  transition: background 0.15s;

  &:hover {
    background: #f1f5f9;
    color: #334155;
  }
`

const CollapsibleBody = styled.div`
  overflow: hidden;
  max-height: ${({ $collapsed }) => ($collapsed ? '0' : '800px')};
  transition: max-height 0.3s ease-in-out;
`

// ── Cards row ───────────────────────────────────────────────────

const CardsRow = styled.div`
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
  align-items: stretch;
`

const StatCard = styled.div`
  flex: 1 1 0;
  min-width: 180px;
  background: linear-gradient(197.77deg, #fffeff 18.23%, #f1f8ff 84.66%);
  border: 1px solid rgba(172, 173, 188, 0.3);
  border-radius: 12px;
  box-shadow: 0 0 15px 0 rgba(173, 173, 173, 0.2);
  padding: 16px 18px 12px;
  display: flex;
  flex-direction: column;
  gap: 6px;
`

const GoalCard = styled(StatCard)`
  flex: 0 0 220px;
  min-width: 200px;
`

const CardLabel = styled.div`
  font-size: 1.2rem;
  font-weight: 600;
  color: #64748b;
`

const CardValue = styled.div`
  font-size: 2.4rem;
  font-weight: 700;
  color: #1e293b;
  line-height: 1.1;
`

const CardUnit = styled.span`
  font-size: 1.2rem;
  font-weight: 500;
  color: #64748b;
  margin-left: 4px;
`

const CardDelta = styled.div`
  font-size: 1.1rem;
  font-weight: 600;
  color: ${({ $positive }) => ($positive ? '#22c55e' : '#ef4444')};
`

const SmallCardStack = styled.div`
  display: flex;
  flex-direction: column;
  gap: 12px;
  flex: 0 0 190px;

  @media (max-width: 1200px) {
    flex: 1 1 160px;
    flex-direction: row;
  }
`

const SmallCard = styled.div`
  flex: 1;
  background: linear-gradient(197.77deg, #fffeff 18.23%, #f1f8ff 84.66%);
  border: 1px solid rgba(172, 173, 188, 0.3);
  border-radius: 12px;
  box-shadow: 0 0 15px 0 rgba(173, 173, 173, 0.2);
  padding: 14px 16px;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  gap: 4px;
`

// ── Pipeline ────────────────────────────────────────────────────

const PipelineWrapper = styled.div`
  margin-top: 12px;
  background: #fff;
  border: 1px solid rgba(172, 173, 188, 0.3);
  border-radius: 12px;
  padding: 14px 20px;
`

const PipelineHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;
`

const PipelineTitle = styled.div`
  font-size: 1.3rem;
  font-weight: 700;
  color: #334155;
`

const ConnectionBadge = styled.div`
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 1.1rem;
  color: #334155;
  font-weight: 500;
  span { display: inline-flex; align-items: center; }
  svg { height: 16px; width: auto; }
  svg text { font-size: 21.5px; font-family: Helvetica, Arial, sans-serif; font-weight: 400; }
`

const ConnectionDot = styled.span`
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #22c55e;
  display: inline-block;
`

const PipelineFlow = styled.div`
  display: flex;
  align-items: center;
  overflow-x: auto;
`

const PipelineStage = styled.div`
  flex: 1;
  min-width: 100px;
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  padding: 10px 14px;
  text-align: center;
`

const PipelineStageName = styled.div`
  font-size: 1.1rem;
  color: #64748b;
  font-weight: 500;
  margin-bottom: 4px;
`

const PipelineStageCount = styled.div`
  font-size: 2rem;
  font-weight: 700;
  color: #1e293b;
`

const PipelineArrow = styled.div`
  color: #94a3b8;
  font-size: 1.2rem;
  flex-shrink: 0;
  padding: 0 8px;
`

// ── Donut label renderer ────────────────────────────────────────

const RADIAN = Math.PI / 180

const renderDonutLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent }) => {
  if (percent < 0.06) return null
  const radius = innerRadius + (outerRadius - innerRadius) * 0.55
  const x = cx + radius * Math.cos(-midAngle * RADIAN)
  const y = cy + radius * Math.sin(-midAngle * RADIAN)
  return (
    <text
      x={x}
      y={y}
      fill="#1e293b"
      textAnchor="middle"
      dominantBaseline="central"
      fontSize={6}
      fontWeight="bold"
    >
      {`${(percent * 100).toFixed(0)}%`}
    </text>
  )
}

const tooltipStyle = {
  background: '#1e293b',
  color: '#fff',
  borderRadius: 8,
  padding: '7px 12px',
  fontSize: '12px',
  boxShadow: '0 4px 12px rgba(0,0,0,0.18)',
  pointerEvents: 'none',
  lineHeight: 1.5
}

const DonutTooltip = ({ active, payload }) => {
  if (!active || !payload?.length) return null
  const item = payload[0].payload
  return (
    <div style={tooltipStyle}>
      <div style={{ fontWeight: 700 }}>{item.name}</div>
      <div style={{ color: '#94a3b8', fontSize: 11 }}>{item.value}%</div>
    </div>
  )
}

const BarTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null
  return (
    <div style={tooltipStyle}>
      <div style={{ color: '#94a3b8', fontSize: 11, marginBottom: 2 }}>{label}</div>
      <div style={{ fontWeight: 700 }}>{payload[0].value}%</div>
    </div>
  )
}

const AreaTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null
  return (
    <div style={tooltipStyle}>
      <div style={{ color: '#94a3b8', fontSize: 11, marginBottom: 2 }}>{label}</div>
      <div style={{ fontWeight: 700 }}>{payload[0].value.toLocaleString()} 개</div>
    </div>
  )
}

// ── Component ───────────────────────────────────────────────────

const REFRESH_INTERVAL = 60 * 1000 // 학습 현황 1분마다 갱신

const LearningStatusSection = ({ isLiveOverride } = {}) => {
  const { t } = useTranslation('robot')
  const [collapsed, setCollapsed] = useState(false)
  const [stats, setStats] = useState(null)

  const load = useCallback(() => {
    getLearningStats().then(setStats).catch(console.error)
  }, [])

  useEffect(() => { load() }, [load])

  const effectiveIsLive = isLiveOverride !== undefined ? isLiveOverride : stats?.isLive

  // 실시간 모드일 때 1분마다 자동 갱신
  useEffect(() => {
    if (!effectiveIsLive) return
    const id = setInterval(load, REFRESH_INTERVAL)
    return () => clearInterval(id)
  }, [effectiveIsLive, load])

  if (!stats) return null

  const { lastUpdated, averageSuccessRate, cumulativeAssets, todayLearningData, learningRobots, pipeline, goalAchievement } = stats
  const successDelta = averageSuccessRate.current - averageSuccessRate.prevWeek

  const handleRefresh = (e) => {
    e.stopPropagation()
    load()
  }

  return (
    <SectionWrapper>
      <SectionHeader $collapsed={collapsed} onClick={() => setCollapsed((v) => !v)}>
        <SectionTitle>{t('learningStatus.title')}</SectionTitle>
        <HeaderRight>
          <UpdateTimeText>
            {t('learningStatus.lastUpdatedLabel')} {lastUpdated}
          </UpdateTimeText>
          {!effectiveIsLive && (
            <RefreshIconBtn type="button" title={t('learningStatus.refresh')} onClick={handleRefresh}>
              ↻
            </RefreshIconBtn>
          )}
          <CollapseBtn type="button" onClick={(e) => { e.stopPropagation(); setCollapsed((v) => !v) }}>
            <Chevron $collapsed={collapsed}>∨</Chevron>
            {collapsed ? t('learningStatus.expand') : t('learningStatus.collapse')}
          </CollapseBtn>
        </HeaderRight>
      </SectionHeader>

      <CollapsibleBody $collapsed={collapsed}>
        <CardsRow>
          {/* ── 목표 달성율 (donut) ── */}
          <GoalCard>
            <CardLabel>{t('learningStatus.goalAchievement')}</CardLabel>
            <CardValue style={{ fontSize: '2rem' }}>
              {goalAchievement.achievedTasks.toLocaleString()}
              <CardUnit style={{ fontWeight: 400, color: '#94a3b8' }}>
                {' '}/ {goalAchievement.totalTasks.toLocaleString()}
                {t('learningStatus.taskUnit') ? ` ${t('learningStatus.taskUnit')}` : ''}
              </CardUnit>
            </CardValue>
            <CardDelta $positive={goalAchievement.isTaskIncrease}>
              {goalAchievement.isTaskIncrease ? '▲' : '▼'} {goalAchievement.taskDelta} {t('learningStatus.vsYesterday')}
            </CardDelta>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <PieChart width={160} height={100}>
                <Pie
                  data={goalAchievement.segments}
                  cx={80}
                  cy={48}
                  innerRadius={28}
                  outerRadius={46}
                  dataKey="value"
                  labelLine={false}
                  label={renderDonutLabel}
                >
                  {goalAchievement.segments.map((entry, index) => (
                    <Cell key={`goal-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip content={<DonutTooltip />} />
              </PieChart>
            </div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {goalAchievement.segments.map((item) => (
                <div
                  key={item.name}
                  style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: '1rem', color: '#64748b' }}
                >
                  <span
                    style={{
                      width: 8,
                      height: 8,
                      borderRadius: '50%',
                      background: item.color,
                      display: 'inline-block',
                      flexShrink: 0
                    }}
                  />
                  {item.name}
                </div>
              ))}
            </div>
          </GoalCard>

          {/* ── 평균 학습 성공률 (bar) ── */}
          <StatCard>
            <CardLabel>{t('learningStatus.avgSuccessRate')}</CardLabel>
            <CardValue>
              {averageSuccessRate.current}
              <CardUnit>%</CardUnit>
            </CardValue>
            <CardDelta $positive={successDelta >= 0}>
              {successDelta >= 0 ? '▲' : '▼'} {Math.abs(successDelta).toFixed(1)}%p {t('learningStatus.vsLastWeek')}
            </CardDelta>
            <div style={{ flex: 1, minHeight: 80, position: 'relative' }}>
              <AutoSize>
                {(w, h) => (
                  <BarChart width={w} height={h} data={averageSuccessRate.weeklyData} margin={{ top: 4, right: 0, bottom: 0, left: 0 }}>
                    <XAxis dataKey="label" hide />
                    <Tooltip content={<BarTooltip />} cursor={{ fill: 'rgba(99,102,241,0.08)' }} />
                    <Bar dataKey="rate" radius={[3, 3, 0, 0]}>
                      {averageSuccessRate.weeklyData.map((_, i) => (
                        <Cell
                          key={`bar-${i}`}
                          fill={i === averageSuccessRate.weeklyData.length - 1 ? '#6366f1' : '#c7d2fe'}
                        />
                      ))}
                    </Bar>
                  </BarChart>
                )}
              </AutoSize>
            </div>
          </StatCard>

          {/* ── 누적 학습 자산 (area) ── */}
          <StatCard>
            <CardLabel>{t('learningStatus.cumulativeAssets')}</CardLabel>
            <CardValue>
              {cumulativeAssets.total.toLocaleString()}
              <CardUnit>개</CardUnit>
            </CardValue>
            <CardDelta $positive={true}>
              + {cumulativeAssets.todayAdded.toLocaleString()} 오늘 · {cumulativeAssets.growthRate}%
            </CardDelta>
            <div style={{ flex: 1, minHeight: 80, position: 'relative' }}>
              <AutoSize>
                {(w, h) => (
                  <AreaChart width={w} height={h} data={cumulativeAssets.trendData} margin={{ top: 4, right: 0, bottom: 0, left: 0 }}>
                    <defs>
                      <linearGradient id="assetGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#818cf8" stopOpacity={0.45} />
                        <stop offset="95%" stopColor="#818cf8" stopOpacity={0.05} />
                      </linearGradient>
                    </defs>
                    <XAxis dataKey="day" hide />
                    <Tooltip content={<AreaTooltip />} cursor={{ stroke: '#818cf8', strokeWidth: 1, strokeDasharray: '3 3' }} />
                    <Area
                      type="monotone"
                      dataKey="count"
                      stroke="#818cf8"
                      strokeWidth={2}
                      fill="url(#assetGrad)"
                      dot={false}
                      activeDot={{ r: 4, fill: '#6366f1', stroke: '#fff', strokeWidth: 2 }}
                    />
                  </AreaChart>
                )}
              </AutoSize>
            </div>
          </StatCard>

          {/* ── 우측 스택 (오늘 생성 데이터 + 학습 중 로봇) ── */}
          <SmallCardStack>
            <SmallCard>
              <CardLabel>{t('learningStatus.todayData')}</CardLabel>
              <CardValue style={{ fontSize: '2rem' }}>
                {todayLearningData.count.toLocaleString()}
                <CardUnit>{todayLearningData.unit}</CardUnit>
              </CardValue>
              <CardDelta $positive={todayLearningData.isIncrease}>
                {todayLearningData.isIncrease ? '▲' : '▼'} {todayLearningData.delta} {t('learningStatus.vsYesterday')}
              </CardDelta>
            </SmallCard>
            <SmallCard>
              <CardLabel>{t('learningStatus.robotCount')}</CardLabel>
              <CardValue style={{ fontSize: '2rem' }}>
                {learningRobots.active}/{learningRobots.total}
                <CardUnit>대</CardUnit>
              </CardValue>
              <CardDelta $positive={learningRobots.isIncrease}>
                {learningRobots.isIncrease ? '▲' : '▼'} {learningRobots.delta} {t('learningStatus.vsYesterday')}
              </CardDelta>
            </SmallCard>
          </SmallCardStack>
        </CardsRow>

        {/* ── 파이프라인 ── */}
        <PipelineWrapper>
          <PipelineHeader>
            <PipelineTitle>{t('learningStatus.pipelineTitle')}</PipelineTitle>
            {pipeline.connectionStatus && (
              <ConnectionBadge>
                <span dangerouslySetInnerHTML={{ __html: forgeLogoSvg }} style={{ display: 'inline-flex', alignItems: 'center', height: '16px' }} />
                <ConnectionDot />
                {pipeline.connectionStatus}
              </ConnectionBadge>
            )}
          </PipelineHeader>
          <PipelineFlow>
            {pipeline.stages.map((stage, i) => (
              <React.Fragment key={stage.name}>
                <PipelineStage>
                  <PipelineStageName>{stage.name}</PipelineStageName>
                  <PipelineStageCount>{stage.count.toLocaleString()}</PipelineStageCount>
                </PipelineStage>
                {i < pipeline.stages.length - 1 && <PipelineArrow>▶</PipelineArrow>}
              </React.Fragment>
            ))}
          </PipelineFlow>
        </PipelineWrapper>
      </CollapsibleBody>
    </SectionWrapper>
  )
}

export default LearningStatusSection
