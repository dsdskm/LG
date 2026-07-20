import React, { useState, useEffect, useCallback, useRef } from 'react'
import forgeLogoSvg from '@/assets/image/svg/PhysicalWorksForge.svg?raw'
import styled from 'styled-components'
import { useTranslation } from 'react-i18next'
import {
  AreaChart,
  Area,
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  Cell,
  LabelList,
  ReferenceLine
} from 'recharts'
import { getCollectionStats } from '@/apis/learning/learningApis'
import { H3SectionTitle } from '../styles'
import { CumulativeIcon, TargetIcon, InboxIcon } from './figmaIcons'

// ── 자체 크기 측정 후 픽셀 크기로 차트 렌더 (ResponsiveContainer 경고 회피) ──
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

// ── palette (Figma 토큰) ─────────────────────────────────────────
// 차트 강조는 크림슨, 보조 수치는 골드, 막대/트랙은 뉴트럴 taupe.
// (변수명은 기존 차트 코드 호환을 위해 유지 — 값만 Figma 색으로 매핑)
const PURPLE = '#b91c4c'      // ACCENT: 라인/면적 강조 (크림슨)
const PURPLE_LT = '#e0839f'   // ACCENT_LT: 연한 크림슨
const GRAY_BAR = '#d9d2c6'    // 뉴트럴 막대(누적시간 등)
const TEXT = '#111111'        // 큰 수치
const MUTED = '#6f6f6f'       // 보조 라벨/축
const POS = '#22a56c'         // 증감(+)
const GOLD = '#d5b267'        // 평균 생산량 값
const GOLD_DK = '#8f6228'     // Total Duration 등 골드 딥
const UNIT = '#4e4e4e'        // 단위 텍스트
const SEG_EMPTY = '#e6e1d6'   // 스토리지 게이지 빈 칸
const SEG_FILL = '#454749'    // 스토리지 게이지 채움

// ── shell ───────────────────────────────────────────────────────
const Wrapper = styled.div`
  margin-top: ${({ $embedded }) => ($embedded ? '0' : '16px')};
  display: flex;
  flex-direction: column;
  gap: 10px;

  /* 전역 '* { font-size: inherit }' 가 recharts 축 텍스트의 font-size 속성을
     덮어써 글자가 커지는 문제 방지 — 클래스 선택자로 명시 px 강제(전역 * 보다 우선). */
  .recharts-cartesian-axis-tick-value,
  .recharts-cartesian-axis-tick-value tspan {
    font-size: 12px;
  }

  /* 범례 텍스트는 시리즈 색(연회색)을 따라가 희미해지므로 진한 회색으로 고정 */
  .recharts-legend-item-text {
    color: #334155 !important;
  }
`

const TopBar = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
`

const TopBarRight = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
`

const UpdatedText = styled.span`
  font-size: 1.2rem;
  color: ${MUTED};
  font-variant-numeric: tabular-nums;
`

// 뷰포트가 아닌 실제 컨테이너 폭에 반응 — 좁아지면 카드가 잘리지 않고 다음 줄로 래핑
const Grid = styled.div`
  display: grid;
  /* 최소 폭(360px) 유지하며 반응형: 넓은 화면(1872px)에선 4열 각 456px,
     좁아지면 필요 시 카드가 아래로 줄바꿈 (auto-fit) */
  grid-template-columns: repeat(auto-fit, minmax(360px, 1fr));
  gap: 16px;
  align-items: stretch;
`

const Card = styled.div`
  min-width: 0;
  min-height: 320px; /* Figma 카드 높이 320 → 줄바꿈돼도 높이 유지 */
  background: #fff;
  border: 1px solid rgba(172, 173, 188, 0.3);
  border-radius: 16px;
  box-shadow: 0 0 15px 0 rgba(173, 173, 173, 0.18);
  padding: 16px 18px 14px;
  display: flex;
  flex-direction: column;
`

const SideCol = styled.div`
  min-width: 0;
  min-height: 320px; /* 우측 열(품질+스토리지)도 카드 1개 높이 유지 */
  display: flex;
  flex-direction: column;
  gap: 16px;
`

const CardHead = styled.div`
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 8px;
  margin-bottom: 10px;
`

const CardTitle = styled.div`
  display: flex;
  align-items: center;
  gap: 7px;
  min-width: 0;
  font-size: 1.35rem;
  font-weight: 700;
  color: #334155;
  word-break: keep-all;
  line-height: 1.2;

  svg {
    flex-shrink: 0;
    width: 18px;
    height: 18px;
    stroke: ${PURPLE};
  }
`

const Badge = styled.span`
  flex-shrink: 0;
  font-size: 1.1rem;
  font-weight: 700;
  color: ${({ $c }) => $c || MUTED};
  background: ${({ $c }) => ($c ? `${$c}1a` : '#f1f5f9')};
  border-radius: 8px;
  padding: 3px 9px;
  white-space: nowrap;
`

const ValueRow = styled.div`
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 8px;
  flex-wrap: wrap;
`

const BigValue = styled.div`
  font-size: 2.8rem;
  font-weight: 800;
  color: ${TEXT};
  line-height: 1.05;
`

const ValueUnit = styled.span`
  font-size: 1.5rem;
  font-weight: 700;
  color: ${UNIT};
  margin-left: 4px;
`

// ── #2 보조 지표 (제목 우측 taupe 뱃지) ──────────────────────────
const SubIndicator = styled.span`
  flex-shrink: 0;
  display: inline-flex;
  align-items: center;
  gap: 4px;
  background: rgba(197, 192, 181, 0.2);
  border-radius: 8px;
  padding: 4px 10px;
  font-size: 1.2rem;
  font-weight: 500;
  white-space: nowrap;
`
const SubLabelG = styled.span`
  color: ${GOLD_DK};
`
const SubValD = styled.span`
  color: #181818;
`

// ── #4 기간 대비 증감 (핵심 수치 우측 초록 텍스트) ───────────────
const PeriodDelta = styled.span`
  flex-shrink: 0;
  align-self: flex-end;
  font-size: 1.3rem;
  font-weight: 700;
  color: ${({ $positive = true }) => ($positive ? POS : '#ef4444')};
  white-space: nowrap;
`

// ── 카드1 보조 요소 (Teleop / 평균 생산량 / 각주) ────────────────
const TeleopLabel = styled.span`
  font-size: 1.2rem;
  color: ${GOLD_DK};
  font-weight: 600;
`

const AvgRow = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 6px;
  /* 영문 제목이 1줄로 접히며 생긴 여백만큼 아래를 채워 차트가 위(라벨 영역)로
     늘어나지 않게 유지 → x축/그래프 높이를 이전과 동일하게 보존 */
  margin-bottom: 1.6rem;
  white-space: nowrap;
`

const AvgTitle = styled.span`
  font-size: 1.2rem;
  color: ${MUTED};
  font-weight: 600;
  white-space: nowrap;
  flex-shrink: 0;
`

const AvgItem = styled.span`
  font-size: 1.2rem;
  color: ${MUTED};
  white-space: nowrap;

  strong {
    color: ${GOLD};
    font-weight: 800;
    margin-left: 3px;
  }
`

const Footnote = styled.span`
  font-size: 1.1rem;
  color: rgba(17, 17, 17, 0.4);
  margin-top: 6px;
  text-align: center;
  width: 100%;
`

// ── 스토리지 세그먼트 게이지 ─────────────────────────────────────
const GaugeWrap = styled.div`
  display: flex;
  flex-direction: column;
  gap: 6px;
  width: 100%;
`

const GaugeBar = styled.div`
  display: flex;
  gap: 3px;
  width: 100%;
`

const Seg = styled.span`
  flex: 1;
  height: 40px;
  border-radius: 4px;
  background: ${({ $on, $fill, $empty }) => ($on ? $fill || SEG_FILL : $empty || SEG_EMPTY)};
`

const GaugeMeta = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 1.2rem;
  color: ${MUTED};

  strong {
    color: ${TEXT};
    font-weight: 800;
  }
`

const ValueMuted = styled.span`
  font-size: 1.9rem;
  font-weight: 700;
  color: ${MUTED};
`

const Delta = styled.span`
  font-size: 1.2rem;
  font-weight: 700;
  color: ${({ $positive }) => ($positive ? POS : '#ef4444')};
  white-space: nowrap;
`

const SubLabel = styled.span`
  font-size: 1.15rem;
  color: ${MUTED};
  font-weight: 500;
`

const ChartBox = styled.div`
  position: relative;
  margin-top: 10px;
  min-height: ${({ $h }) => $h || 160}px;
  flex: 1;
`

const TodayTag = styled.span`
  position: absolute;
  right: 6px;
  bottom: 6px;
  font-size: 1.2rem;
  font-weight: 800;
  color: ${PURPLE_LT};
  letter-spacing: 0.04em;
  pointer-events: none;
`

// 달성률 말풍선
const Bubble = styled.div`
  position: absolute;
  transform: translate(-50%, -100%);
  background: #334155;
  color: #fff;
  font-size: 1.2rem;
  font-weight: 800;
  padding: 3px 9px;
  border-radius: 8px;
  pointer-events: none;
  white-space: nowrap;
  &::after {
    content: '';
    position: absolute;
    left: 50%;
    bottom: -5px;
    transform: translateX(-50%);
    border-left: 5px solid transparent;
    border-right: 5px solid transparent;
    border-top: 5px solid #334155;
  }
`

// side card body
const SideBody = styled.div`
  display: flex;
  align-items: stretch;
  gap: 10px;
  flex: 1;
  min-height: 0;
`

const SideLeft = styled.div`
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 6px;
  flex: 0 0 auto;
  min-width: 96px;
`

const SideViz = styled.div`
  position: relative;
  flex: 1;
  min-height: ${({ $h }) => $h || 84}px;
  align-self: stretch;
`

// storage slider
const SliderTrack = styled.div`
  position: relative;
  height: 12px;
  border-radius: 8px;
  background: #eef2f7;
  margin-top: 26px;
`
const SliderFill = styled.div`
  position: absolute;
  left: 0;
  top: 0;
  height: 100%;
  border-radius: 8px;
  background: linear-gradient(90deg, ${PURPLE_LT}, ${PURPLE});
  width: ${({ $pct }) => Math.min(100, Math.max(0, $pct))}%;
`
const SliderThumb = styled.div`
  position: absolute;
  top: 50%;
  width: 18px;
  height: 18px;
  border-radius: 50%;
  background: ${PURPLE};
  border: 3px solid #fff;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.25);
  transform: translate(-50%, -50%);
  left: ${({ $pct }) => Math.min(100, Math.max(0, $pct))}%;
`

// Forge 연동 상태 바
const ForgeBar = styled.div`
  background: #fff;
  border: 1px solid rgba(172, 173, 188, 0.3);
  border-radius: 16px;
  box-shadow: 0 0 15px 0 rgba(173, 173, 173, 0.18);
  padding: 12px 18px;
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 12px;
`
const ForgeName = styled.span`
  display: inline-flex;
  align-items: center;
  svg { height: 18px; width: auto; }
  svg text { font-size: 21.5px; font-family: Helvetica, Arial, sans-serif; font-weight: 400; }
`
const ForgeStatus = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 7px;
  font-size: 1.2rem;
  font-weight: 700;
  color: #454749;
  background: #eae8e2;
  border: 1px solid rgba(140, 134, 120, 0.35);
  border-radius: 20px;
  padding: 4px 12px;
`
const StatusDot = styled.span`
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #22c55e;
`

// ── icons (thin line) ───────────────────────────────────────────
const IconLayers = (p) => (
  <svg viewBox="0 0 24 24" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}>
    <path d="M12 2 2 7l10 5 10-5-10-5Z" />
    <path d="m2 17 10 5 10-5" />
    <path d="m2 12 10 5 10-5" />
  </svg>
)
const IconTarget = (p) => (
  <svg viewBox="0 0 24 24" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}>
    <circle cx="12" cy="12" r="9" />
    <circle cx="12" cy="12" r="5" />
    <circle cx="12" cy="12" r="1" />
  </svg>
)
const IconTray = (p) => (
  <svg viewBox="0 0 24 24" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}>
    <path d="M22 12h-6l-2 3h-4l-2-3H2" />
    <path d="M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11Z" />
  </svg>
)
const IconDisk = (p) => (
  <svg viewBox="0 0 24 24" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}>
    <ellipse cx="12" cy="5" rx="9" ry="3" />
    <path d="M3 5v14a9 3 0 0 0 18 0V5" />
    <path d="M3 12a9 3 0 0 0 18 0" />
  </svg>
)

// ── tooltip / helpers ───────────────────────────────────────────
const tooltipStyle = {
  background: '#1e293b',
  color: '#fff',
  borderRadius: 8,
  padding: '7px 12px',
  fontSize: '12px',
  boxShadow: '0 4px 12px rgba(0,0,0,0.18)',
  pointerEvents: 'none',
  lineHeight: 1.6
}

const GenTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null
  return (
    <div style={tooltipStyle}>
      <div style={{ color: '#94a3b8', fontSize: 11, marginBottom: 2 }}>{label}</div>
      {payload.map((p) => (
        // 값 텍스트는 흰색(시인성) + 시리즈 색은 좌측 점(swatch)으로 구분
        <div key={p.dataKey} style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 700, color: '#fff' }}>
          <span
            style={{
              width: 8,
              height: 8,
              borderRadius: 2,
              background: p.color || '#fff',
              flexShrink: 0,
              display: 'inline-block'
            }}
          />
          {p.name}: {Number(p.value).toLocaleString()}
        </div>
      ))}
    </div>
  )
}

const formatK = (n) => {
  if (n >= 1000) {
    const k = n / 1000
    return `${Number.isInteger(k) ? k : k.toFixed(1)}k`
  }
  return String(n)
}

// 마지막 지점에만 점을 그리는 dot 렌더러
const makeLastDot = (len, color = PURPLE) =>
  function LastDot({ cx, cy, index }) {
    if (index !== len - 1 || cx == null || cy == null)
      return <circle key={`d-${index}`} cx={cx || 0} cy={cy || 0} r={0} fill="none" />
    return <circle key={`d-${index}`} cx={cx} cy={cy} r={5} fill={color} stroke="#fff" strokeWidth={2} />
  }

// 실적 라인 dot — 현재(마지막) 지점을 크게 강조
const makeActualDot = (len, color = PURPLE) =>
  function ActualDot({ cx, cy, index }) {
    if (cx == null || cy == null) return <circle key={`a-${index}`} r={0} fill="none" />
    const last = index === len - 1
    return (
      <circle
        key={`a-${index}`}
        cx={cx}
        cy={cy}
        r={last ? 5.5 : 2.5}
        fill={color}
        stroke={last ? '#fff' : 'none'}
        strokeWidth={last ? 2 : 0}
      />
    )
  }

// 현재(마지막) 지점 좌표에 달성률(%) 말풍선 라벨
const makePctLabel = (len, pct) =>
  function PctLabel({ x, y, index }) {
    if (index !== len - 1 || x == null || y == null) return null
    const w = 40
    const h = 18
    const bx = x - w / 2
    const by = y - h - 10
    return (
      <g>
        <rect x={bx} y={by} width={w} height={h} rx={8} ry={8} fill="#334155" />
        <text
          x={x}
          y={by + h / 2 + 1}
          fill="#fff"
          style={{ fontSize: '1.2rem', fontWeight: 800 }}
          textAnchor="middle"
          dominantBaseline="central"
        >
          {pct}%
        </text>
        <polygon
          points={`${x - 5},${by + h} ${x + 5},${by + h} ${x},${by + h + 5}`}
          fill="#334155"
        />
      </g>
    )
  }

const REFRESH_INTERVAL = 60 * 1000 // 학습 데이터 현황 1분마다 갱신
const STORAGE_SEGMENTS = 20 // 스토리지 게이지 세그먼트 수

// ── Component ───────────────────────────────────────────────────
const DataCollectionSection = ({
  isLiveOverride,
  chartHeight,
  embedded = false,
  showSectionTitle = true,
  showForgeBar = true,
  // 컬러모드용 차트 색 역할 (fill 은 색 또는 'url(#...)' 참조)
  line = PURPLE,               // 라인 / dot / 기준선
  areaColor = PURPLE,          // 라인 아래 면적 채움
  targetColor = PURPLE_LT,     // 목표 점선 / 커서
  monFill = GRAY_BAR,          // 월간 누적시간 막대
  qEmphFill = PURPLE,          // 품질 최대 막대
  qBaseFill = '#e6e1d6',       // 품질 그외 막대
  segFill = PURPLE,            // 스토리지 게이지 사용(색 또는 CSS 그라데이션)
  segEmpty = '#e6e1d6'         // 스토리지 게이지 미사용
} = {}) => {
  const { t, i18n } = useTranslation('robot')
  const [stats, setStats] = useState(null)

  const load = useCallback(() => {
    getCollectionStats().then(setStats).catch(console.error)
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const effectiveIsLive = isLiveOverride !== undefined ? isLiveOverride : stats?.isLive
  useEffect(() => {
    if (!effectiveIsLive) return
    const id = setInterval(load, REFRESH_INTERVAL)
    return () => clearInterval(id)
  }, [effectiveIsLive, load])

  if (!stats) return null

  const { lastUpdated, forge, cumulative, monthly, daily, quality, storage } = stats

  const bigH = chartHeight || 160
  // 달성률 말풍선: mock에 achievementPct 있으면 사용, 없으면 실적/목표로 계산
  const monthlyPct = monthly.achievementPct ?? Math.round((monthly.actual / monthly.target) * 100)
  const dailyPct = daily.achievementPct ?? Math.round((daily.actual / daily.target) * 100)
  const prevMonthLabel = t('collection.lastMonth', '전월')
  const yesterdayLabel = t('collection.yesterday', '전일')
  // 영문은 라벨(Monthly/Daily/Hourly)만으로 의미가 명확해 'cases' 단위를 생략 → 1줄 표시
  const caseUnit = i18n.language?.startsWith('en') ? '' : t('collection.caseUnit', '건')

  return (
    <Wrapper $embedded={embedded}>
      {showSectionTitle && (
        <TopBar>
          <H3SectionTitle style={{ marginBottom: 0 }}>{t('collection.sectionTitle')}</H3SectionTitle>
          <TopBarRight>
            <UpdatedText>
              {t('collection.lastUpdatedLabel')} {lastUpdated}
            </UpdatedText>
          </TopBarRight>
        </TopBar>
      )}

      <Grid>
        {/* 1) 누적 학습 데이터 */}
        <Card>
          <CardHead>
            <CardTitle>
              <CumulativeIcon />
              {t('collection.cumulativeTitle')}
            </CardTitle>
            {/* #2 보조 지표: 누적 학습시간 */}
            <SubIndicator>
              <SubLabelG>{t('collection.totalDuration')}</SubLabelG>
              <SubValD>{cumulative.totalDurationH.toLocaleString()} h</SubValD>
            </SubIndicator>
          </CardHead>
          <ValueRow>
            <BigValue>
              {cumulative.episodes.toLocaleString()}
              <ValueUnit>{t('collection.episodes')}</ValueUnit>
            </BigValue>
            {/* #4 기간 대비 증감 */}
            <PeriodDelta>+ {cumulative.deltaYesterday.toLocaleString()} {yesterdayLabel}</PeriodDelta>
          </ValueRow>
          {cumulative.avgProduction && (
            <AvgRow>
              <AvgTitle>{t('collection.avgProduction', '평균 생산량')}</AvgTitle>
              <AvgItem>{t('collection.monthlyShort', '월간')}<strong>{cumulative.avgProduction.monthly.toLocaleString()}{caseUnit}</strong></AvgItem>
              <AvgItem>{t('collection.dailyShort', '일간')}<strong>{cumulative.avgProduction.daily.toLocaleString()}{caseUnit}</strong></AvgItem>
              <AvgItem>{t('collection.hourlyShort', '시간당')}<strong>{cumulative.avgProduction.hourly.toLocaleString()}{caseUnit}</strong></AvgItem>
            </AvgRow>
          )}
          <ChartBox $h={bigH}>
            <AutoSize>
              {(w, h) => (
                <AreaChart data={cumulative.trend} width={w} height={h} margin={{ top: 8, right: 6, bottom: 0, left: 0 }}>
                  <defs>
                    <linearGradient id="cumGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={areaColor} stopOpacity={0.35} />
                      <stop offset="100%" stopColor={areaColor} stopOpacity={0.03} />
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="month" tick={{ fontSize: 9, fill: MUTED }} axisLine={false} tickLine={false} interval="preserveStartEnd" />
                  <YAxis tickFormatter={(v) => `${Math.round(v / 1000)}K`} tick={{ fontSize: 9, fill: MUTED }} axisLine={false} tickLine={false} width={28} domain={['dataMin - 2000', 'dataMax + 1500']} />
                  <Tooltip content={<GenTooltip />} cursor={{ stroke: targetColor, strokeDasharray: '3 3' }} />
                  {/* 오늘(마지막 지점) 세로 기준선 — 2·3번 차트와 동일 (텍스트 없음) */}
                  <ReferenceLine
                    x={cumulative.trend[cumulative.trend.length - 1].month}
                    stroke={line}
                    strokeWidth={1.5}
                    strokeDasharray="4 3"
                    ifOverflow="visible"
                  />
                  <Area
                    type="monotone"
                    dataKey="value"
                    name={t('collection.episodes')}
                    stroke={line}
                    strokeWidth={2.5}
                    fill="url(#cumGrad)"
                    dot={makeLastDot(cumulative.trend.length, line)}
                  />
                </AreaChart>
              )}
            </AutoSize>
          </ChartBox>
          <Footnote>{t('collection.cumulativeFootnote', '* 현재까지 수집된 전체 학습 Episode 수')}</Footnote>
        </Card>

        {/* 2) 월간 데이터 목표 실적 */}
        <Card>
          <CardHead>
            <CardTitle>
              <TargetIcon />
              {t('collection.monthlyTitle')}
            </CardTitle>
            {/* #2 보조 지표: 계획 대비 */}
            <SubIndicator>
              <SubLabelG>{t('collection.vsPlan', '계획 대비')}</SubLabelG>
              <SubValD>+{monthly.vsPlanPct}%p</SubValD>
            </SubIndicator>
          </CardHead>
          <ValueRow>
            <BigValue>
              {monthly.actual.toLocaleString()}
              <ValueMuted> / {monthly.target.toLocaleString()}</ValueMuted>
              <ValueUnit>{t('collection.episodes')}</ValueUnit>
            </BigValue>
            {/* #4 기간 대비 증감 */}
            {monthly.deltaPrev != null && (
              <PeriodDelta>+ {monthly.deltaPrev.toLocaleString()} {prevMonthLabel}</PeriodDelta>
            )}
          </ValueRow>
          <ChartBox $h={bigH + 20}>
            <AutoSize>
              {(w, h) => (
                <ComposedChart data={monthly.data} width={w} height={h} margin={{ top: 10, right: 0, bottom: 0, left: 0 }}>
                  <defs>
                    <linearGradient id="monActualGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={areaColor} stopOpacity={0.3} />
                      <stop offset="100%" stopColor={areaColor} stopOpacity={0.02} />
                    </linearGradient>
                    {/* 막대 그라데이션: 골드(Solid) / 회색(Gradient) */}
                    <linearGradient id="monGold" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#b5a98f" stopOpacity={1} />
                      <stop offset="100%" stopColor="#c5a152" stopOpacity={0.4} />
                    </linearGradient>
                    <linearGradient id="monGray" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#b7b4ae" />
                      <stop offset="100%" stopColor="#e6e1d6" />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#eef2f7" vertical={false} />
                  <XAxis
                    dataKey="month"
                    tick={{ fontSize: 9, fill: MUTED }}
                    axisLine={false}
                    tickLine={false}
                    interval="preserveStartEnd"
                    minTickGap={10}
                  />
                  <YAxis
                    yAxisId="ep"
                    tick={{ fontSize: 9, fill: MUTED }}
                    axisLine={false}
                    tickLine={false}
                    width={34}
                    tickCount={5}
                    tickFormatter={formatK}
                  />
                  <YAxis
                    yAxisId="hr"
                    orientation="right"
                    tick={{ fontSize: 9, fill: MUTED }}
                    axisLine={false}
                    tickLine={false}
                    width={34}
                    tickCount={5}
                    tickFormatter={(v) => `${v}h`}
                  />
                  <Tooltip content={<GenTooltip />} cursor={{ fill: 'rgba(139,92,246,0.06)' }} />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  <Bar yAxisId="hr" dataKey="cumTime" name={t('collection.cumTime')} fill={monFill} radius={[3, 3, 0, 0]} barSize={12} />
                  <ReferenceLine
                    yAxisId="ep"
                    x={monthly.data[monthly.data.length - 1].month}
                    stroke={line}
                    strokeWidth={1.5}
                    strokeDasharray="4 3"
                  />
                  {/* 목표(target) 라인 아래를 채움 */}
                  <Area
                    yAxisId="ep"
                    type="monotone"
                    dataKey="target"
                    name={t('collection.target')}
                    stroke={targetColor}
                    strokeWidth={2}
                    strokeDasharray="5 4"
                    fill="url(#monActualGrad)"
                    dot={false}
                  />
                  {/* 실적(actual)은 라인만 (dot + 달성률 말풍선) */}
                  <Line
                    yAxisId="ep"
                    type="monotone"
                    dataKey="actual"
                    name={t('collection.actual')}
                    stroke={line}
                    strokeWidth={2.5}
                    dot={makeActualDot(monthly.data.length, line)}
                  >
                    <LabelList dataKey="actual" content={makePctLabel(monthly.data.length, monthlyPct)} />
                  </Line>
                </ComposedChart>
              )}
            </AutoSize>
          </ChartBox>
        </Card>

        {/* 3) 일간 데이터 목표 실적 */}
        <Card>
          <CardHead>
            <CardTitle>
              <TargetIcon />
              {t('collection.dailyTitle')}
            </CardTitle>
            {/* #2 보조 지표: 계획 대비 */}
            <SubIndicator>
              <SubLabelG>{t('collection.vsPlan', '계획 대비')}</SubLabelG>
              <SubValD>+{daily.vsPlanPct}%p</SubValD>
            </SubIndicator>
          </CardHead>
          <ValueRow>
            <BigValue>
              {daily.actual.toLocaleString()}
              <ValueMuted> / {daily.target.toLocaleString()}</ValueMuted>
              <ValueUnit>{t('collection.episodes')}</ValueUnit>
            </BigValue>
            {/* #4 기간 대비 증감 */}
            {daily.deltaPrev != null && (
              <PeriodDelta>+ {daily.deltaPrev.toLocaleString()} {yesterdayLabel}</PeriodDelta>
            )}
          </ValueRow>
          <ChartBox $h={bigH + 20}>
            <AutoSize>
              {(w, h) => (
                <ComposedChart data={daily.data} width={w} height={h} margin={{ top: 10, right: 20, bottom: 0, left: 0 }}>
                  <defs>
                    <linearGradient id="dayActualGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={areaColor} stopOpacity={0.3} />
                      <stop offset="100%" stopColor={areaColor} stopOpacity={0.02} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#eef2f7" vertical={false} />
                  <XAxis
                    dataKey="day"
                    tick={{ fontSize: 9, fill: MUTED }}
                    axisLine={false}
                    tickLine={false}
                    interval="preserveStartEnd"
                    minTickGap={22}
                  />
                  <YAxis tick={{ fontSize: 9, fill: MUTED }} axisLine={false} tickLine={false} width={34} tickCount={5} domain={[0, 'dataMax + 40']} />
                  <Tooltip content={<GenTooltip />} cursor={{ stroke: '#cbd5e1', strokeWidth: 1 }} />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  {/* 오늘(마지막 일자) 고정 세로선 — 날짜는 하단 x축에 표시 */}
                  <ReferenceLine
                    x={daily.data[daily.data.length - 1].day}
                    stroke={line}
                    strokeWidth={1.5}
                    strokeDasharray="4 3"
                    ifOverflow="visible"
                  />
                  {/* 목표(target) 라인 아래를 채움 */}
                  <Area
                    type="monotone"
                    dataKey="target"
                    name={t('collection.target')}
                    stroke={targetColor}
                    strokeWidth={2}
                    strokeDasharray="5 4"
                    fill="url(#dayActualGrad)"
                    dot={false}
                  />
                  {/* 실적(actual)은 라인만 (dot + 달성률 말풍선) */}
                  <Line
                    type="monotone"
                    dataKey="actual"
                    name={t('collection.actual')}
                    stroke={line}
                    strokeWidth={2.5}
                    dot={makeActualDot(daily.data.length, line)}
                    activeDot={{ r: 5, stroke: '#fff', strokeWidth: 2 }}
                  >
                    <LabelList dataKey="actual" content={makePctLabel(daily.data.length, dailyPct)} />
                  </Line>
                </ComposedChart>
              )}
            </AutoSize>
          </ChartBox>
        </Card>

        {/* 4~5) 우측 열 */}
        <SideCol>
          {/* 데이터 품질 추이 */}
          <Card style={{ flex: '1 1 0', minHeight: 0, overflow: 'hidden' }}>
            <CardHead>
              <CardTitle>
                <InboxIcon />
                {t('collection.qualityTitle')}
              </CardTitle>
            </CardHead>
            <SideBody>
              <SideLeft>
                <BigValue style={{ fontSize: '2.4rem' }}>
                  {quality.current}
                  <ValueUnit>%</ValueUnit>
                </BigValue>
                <Badge $c={POS} style={{ alignSelf: 'flex-start' }}>
                  + {Math.abs(quality.deltaPct).toFixed(quality.deltaPct % 1 === 0 ? 0 : 1)}% {prevMonthLabel}
                </Badge>
              </SideLeft>
              <SideViz $h={90}>
                <AutoSize>
                  {(w, h) => {
                    const qAvg = quality.data.reduce((s, d) => s + d.rate, 0) / quality.data.length
                    const qRates = quality.data.map((d) => d.rate)
                    const qMaxIdx = qRates.lastIndexOf(Math.max(...qRates))
                    return (
                    <ComposedChart data={quality.data} width={w} height={h} margin={{ top: 24, right: 26, bottom: 0, left: 26 }}>
                      <defs>
                        {/* 골드(Solid): 세로 그라데이션 */}
                        <linearGradient id="qGold" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#b5a98f" stopOpacity={1} />
                          <stop offset="100%" stopColor="#c5a152" stopOpacity={0.4} />
                        </linearGradient>
                        {/* 크림슨(Gradient): 335deg 대각 3-stop */}
                        <linearGradient id="qCrimson" x1="0.71" y1="0.95" x2="0.29" y2="0.05">
                          <stop offset="11.32%" stopColor="#cd7b94" />
                          <stop offset="44.35%" stopColor="#bf2d59" />
                          <stop offset="77.37%" stopColor="#b91c4c" />
                        </linearGradient>
                      </defs>
                      <XAxis
                        dataKey="month"
                        tick={{ fontSize: 9, fill: MUTED }}
                        axisLine={false}
                        tickLine={false}
                        interval="preserveStartEnd"
                        minTickGap={6}
                      />
                      <YAxis hide width={0} domain={[88, 96]} />
                      <Tooltip content={<GenTooltip />} cursor={{ fill: 'rgba(139,92,246,0.06)' }} />
                      {/* 평균 점선 (값 표시 없음) */}
                      <ReferenceLine
                        y={qAvg}
                        stroke={MUTED}
                        strokeWidth={1.5}
                        strokeDasharray="5 4"
                        ifOverflow="visible"
                      />
                      <ReferenceLine
                        x={quality.data[quality.data.length - 1].month}
                        stroke={line}
                        strokeWidth={1.5}
                        strokeDasharray="4 3"
                      />
                      <Bar dataKey="rate" name={t('collection.qualityTitle')} radius={[3, 3, 0, 0]}>
                        {/* 최대 막대 = qEmphFill, 그외 = qBaseFill (Solid 은 둘 다 골드로 동일) */}
                        {quality.data.map((d, i) => (
                          <Cell key={`qc-${i}`} fill={i === qMaxIdx ? qEmphFill : qBaseFill} />
                        ))}
                        <LabelList
                          dataKey="rate"
                          content={({ x, y, width, value, index }) => {
                            const rates = quality.data.map(d => d.rate)
                            const min = Math.min(...rates)
                            const max = Math.max(...rates)
                            const lastMinIdx = rates.lastIndexOf(min)
                            const lastMaxIdx = rates.lastIndexOf(max)
                            if (index !== lastMinIdx && index !== lastMaxIdx) return null
                            const isMax = index === lastMaxIdx
                            const bg = isMax ? '#334155' : '#94a3b8'
                            const w = 52, h = 18
                            const cx = x + width / 2
                            const by = y - h - 6
                            return (
                              <g key={`ql-${value}`}>
                                <rect x={cx - w / 2} y={by} width={w} height={h} rx={8} ry={8} fill={bg} />
                                <text x={cx} y={by + h / 2 + 1} fill="#fff" style={{ fontSize: '1.2rem', fontWeight: 800 }} textAnchor="middle" dominantBaseline="central">
                                  {value}%
                                </text>
                                <polygon points={`${cx - 5},${by + h} ${cx + 5},${by + h} ${cx},${by + h + 5}`} fill={bg} />
                              </g>
                            )
                          }}
                        />
                      </Bar>
                    </ComposedChart>
                    )
                  }}
                </AutoSize>
              </SideViz>
            </SideBody>
          </Card>

          {/* 스토리지 사용량 */}
          <Card style={{ flex: '1 1 0', minHeight: 0, overflow: 'hidden' }}>
            <CardHead>
              <CardTitle>
                <InboxIcon />
                {t('collection.storageTitle')}
              </CardTitle>
            </CardHead>
            <SideBody>
              <SideLeft>
                <BigValue style={{ fontSize: '2.4rem' }}>
                  {storage.gb}
                  <ValueUnit>GB</ValueUnit>
                </BigValue>
                <Badge $c={POS} style={{ alignSelf: 'flex-start' }}>
                  {storage.deltaGb != null
                    ? `+ ${storage.deltaGb}G ${prevMonthLabel}`
                    : `▲ ${Math.abs(storage.deltaPct).toFixed(1)}%p`}
                </Badge>
              </SideLeft>
              <SideViz $h={90} style={{ display: 'flex', alignItems: 'center' }}>
                <GaugeWrap>
                  {/* 사용률 버블 (다른 차트처럼 그래프 위쪽에 표시) */}
                  <div style={{ position: 'relative', height: 22, width: '100%' }}>
                    <Bubble style={{ left: `${storage.usedPct}%`, top: '100%' }}>{storage.usedPct}%</Bubble>
                  </div>
                  <GaugeBar>
                    {Array.from({ length: STORAGE_SEGMENTS }).map((_, i) => (
                      <Seg key={i} $on={i < Math.round((storage.usedPct / 100) * STORAGE_SEGMENTS)} $fill={segFill} $empty={segEmpty} />
                    ))}
                  </GaugeBar>
                  {storage.totalLabel && (
                    <GaugeMeta>
                      <span style={{ marginLeft: 'auto' }}>{storage.totalLabel}</span>
                    </GaugeMeta>
                  )}
                </GaugeWrap>
              </SideViz>
            </SideBody>
          </Card>
        </SideCol>
      </Grid>

      {/* Forge 연동 상태 */}
      {showForgeBar && (
      <ForgeBar>
        <ForgeName dangerouslySetInnerHTML={{ __html: forgeLogoSvg }} style={{ display: 'inline-flex', alignItems: 'center', height: '16px' }} />
        <ForgeStatus>
          <StatusDot />
          {forge.status}
        </ForgeStatus>
      </ForgeBar>
      )}
    </Wrapper>
  )
}

export default DataCollectionSection
