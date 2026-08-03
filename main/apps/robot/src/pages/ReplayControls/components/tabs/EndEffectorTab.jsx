import React, { useMemo, useRef, useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { UX, theme } from '../../styles'
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, ReferenceLine } from 'recharts'
import { rosStampToKstHms } from '@/utils/dateUtils'
import { selectSampleAtTime, indexAtTime } from '../../utils/sampleSelect'
import { useAnalysisThresholds } from '../../AnalysisThresholdsContext'
import { DEFAULT_ANALYSIS_THRESHOLDS } from '../../analysisConfig'
/* ───────────────── helpers ───────────────── */

// 모듈 스코프 헬퍼 기본값(컴포넌트 밖은 context 사용 불가)
const HAND_DEF = DEFAULT_ANALYSIS_THRESHOLDS.hand

// rad → deg
const rad2deg = (r) => (typeof r === 'number' ? (r * 180) / Math.PI : null)

const FINGERS = ['Thumb', 'Index', 'Middle', 'Ring', 'Pinky']

function safeNotice(kind, text) {
  if (typeof UX.noticePill === 'function') return <div style={UX.noticePill(kind)}>{text}</div>
  const bg = kind === 'error' ? '#FEE2E2' : kind === 'warn' ? '#FEF3C7' : kind === 'info' ? '#E0F2FE' : '#F3F4F6'
  return (
    <div style={{ padding: 10, borderRadius: 10, background: bg, fontSize: 12, color: theme.colors.text }}>{text}</div>
  )
}

function safeBadge(opts, text) {
  if (typeof UX.badge === 'function') return <span style={UX.badge(opts)}>{text}</span>
  const bg = opts?.error ? '#EF4444' : opts?.warn ? '#F59E0B' : opts?.ok ? '#10B981' : '#E5E7EB'
  const color = opts?.error ? '#fff' : '#111827'
  return <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 999, background: bg, color }}>{text}</span>
}

// 상대초(tSec) → KST HH:MM:SS
function formatKstTime(tSec, timeRange) {
  const base = timeRange?.absStartSec ?? timeRange?.startSec
  if (typeof base !== 'number' || typeof tSec !== 'number') return '-'
  const absMs = (base + tSec) * 1000

  const d = new Date(absMs) // 브라우저 로컬 타임존(KST) 기준으로 표시됨
  return d.toLocaleTimeString('ko-KR', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' })
}

// finger name → group(단순 키워드 매핑)
function buildFingerIndexMap(names = [], side = 'left') {
  const map = {}
  for (const f of FINGERS) map[f] = []

  names.forEach((n, idx) => {
    if (typeof n !== 'string') return

    // ✅ fallback 허용
    const matchesSide = n.startsWith(side + '_')

    const ln = n.toLowerCase()
    if (ln.includes('thumb')) map.Thumb.push({ idx, name: n })
    else if (ln.includes('index')) map.Index.push({ idx, name: n })
    else if (ln.includes('middle')) map.Middle.push({ idx, name: n })
    else if (ln.includes('ring')) map.Ring.push({ idx, name: n })
    else if (ln.includes('pinky')) map.Pinky.push({ idx, name: n })

    if (Object.values(map).every((arr) => arr.length === 0)) {
      // fallback: 모든 joint를 하나 그룹으로
      map.Thumb = names.map((n, idx) => ({ idx, name: n }))
    }
  })

  return map
}

function buildFingerMapFromJointGroups(names = [], jointGroups, side = 'left') {
  const fromGroups = jointGroups?.hands?.[side]
  if (!fromGroups) {
    return buildFingerIndexMap(names, side)
  }

  const map = {}
  for (const finger of FINGERS) {
    const idxs = Array.isArray(fromGroups[finger]) ? fromGroups[finger] : []
    map[finger] = idxs.map((idx) => ({
      idx,
      name: names[idx] ?? `joint_${idx}`
    }))
  }

  const total = FINGERS.reduce((acc, f) => acc + map[f].length, 0)
  if (total === 0) {
    return buildFingerIndexMap(names, side)
  }

  return map
}

// Finger Curl % (heuristic)
function computeFingerCurl(sample, joints) {
  if (!sample || !joints?.length) return null
  let sum = 0
  let n = 0

  for (const j of joints) {
    const rad = sample?.position?.[j.idx]
    if (typeof rad !== 'number') continue
    const deg = Math.abs(rad2deg(rad))

    // 휴리스틱: finger curl 관절 각도를 0~90deg로 클램프해 평균
    sum += Math.min(90, deg) / 90
    n++
  }
  if (!n) return null
  return Math.max(0, Math.min(100, (sum / n) * 100))
}

// finger velocity RMS (window 기반)
function computeFingerVelRms(samples, joints, windowSize = 120) {
  if (!samples?.length || !joints?.length) return null
  const tail = samples.slice(Math.max(0, samples.length - windowSize))

  let acc = 0
  let n = 0
  for (const s of tail) {
    for (const j of joints) {
      const v = s?.velocity?.[j.idx]
      if (typeof v === 'number') {
        acc += v * v
        n++
      }
    }
  }
  if (!n) return null
  return Math.sqrt(acc / n)
}

// hand-level metrics
function computeHandMetrics(currentSample, jointSamples, fingerMap, windowSize) {
  const finger = {}
  const curls = []
  const vrms = []

  for (const f of FINGERS) {
    const joints = fingerMap[f]
    const c = computeFingerCurl(currentSample, joints)
    const v = computeFingerVelRms(jointSamples, joints, windowSize)
    finger[f] = { curl: c, vRms: v, joints }
    if (typeof c === 'number') curls.push(c)
    if (typeof v === 'number') vrms.push(v)
  }

  const avgCurl = curls.length ? curls.reduce((a, b) => a + b, 0) / curls.length : null
  const minCurl = curls.length ? Math.min(...curls) : null
  const maxCurl = curls.length ? Math.max(...curls) : null
  const asym = curls.length ? Math.max(...curls) - Math.min(...curls) : null

  // hand velocity RMS는 finger vRms 평균(가볍게)
  const handVrms = vrms.length ? vrms.reduce((a, b) => a + b, 0) / vrms.length : null

  return { finger, avgCurl, minCurl, maxCurl, asym, handVrms }
}

// 최근 변화량(Δcurl) 추정: currentTime vs (currentTime - deltaSec)
function computeHandCurlDelta(wrapped, totalDuration, fingerMap, currentTime, deltaSec = 0.4) {
  const now = selectSampleAtTime(wrapped, currentTime, totalDuration)
  const prev = selectSampleAtTime(wrapped, Math.max(0, currentTime - deltaSec), totalDuration)
  if (!now || !prev) return null

  // avgCurl만 필요하므로 lightweight로 재계산
  const nowC = computeAvgCurlOnly(now, fingerMap)
  const prevC = computeAvgCurlOnly(prev, fingerMap)
  if (typeof nowC !== 'number' || typeof prevC !== 'number') return null
  return nowC - prevC
}

// avgCurl만 빠르게 계산(차트/델타용)
function computeAvgCurlOnly(sample, fingerMap) {
  const curls = []
  for (const f of FINGERS) {
    const c = computeFingerCurl(sample, fingerMap[f])
    if (typeof c === 'number') curls.push(c)
  }
  return curls.length ? curls.reduce((a, b) => a + b, 0) / curls.length : null
}

// asym만 빠르게 계산(차트용)
function computeAsymOnly(sample, fingerMap) {
  const curls = []
  for (const f of FINGERS) {
    const c = computeFingerCurl(sample, fingerMap[f])
    if (typeof c === 'number') curls.push(c)
  }
  if (!curls.length) return null
  return Math.max(...curls) - Math.min(...curls)
}

// 상태 분류(과하지 않게, joint 기반 추정임을 UI에 명시)
function classifyHandState(avgCurl, handVrms, deltaCurl, opts = {}) {
  const v = typeof handVrms === 'number' ? handVrms : null
  const d = typeof deltaCurl === 'number' ? deltaCurl : 0
  const c = typeof avgCurl === 'number' ? avgCurl : null

  const V_STATIC = opts.staticVel ?? HAND_DEF.staticVel
  const D_MOVE = opts.moveDeltaPct ?? HAND_DEF.moveDeltaPct // 0.4s 기준 이 % 이상 변화면 동작으로 간주(추정)
  const GRASP = opts.graspCurlPct ?? HAND_DEF.graspCurlPct

  if (v != null && v < V_STATIC) {
    if (c != null && c >= GRASP) return { label: 'Grasp (est.)', kind: 'ok' }
    if (c != null && c <= 10) return { label: 'Open / Idle', kind: 'info' }
    return { label: 'Idle', kind: 'info' }
  }

  if (d > D_MOVE) return { label: 'Closing', kind: 'warn' }
  if (d < -D_MOVE) return { label: 'Opening', kind: 'warn' }
  return { label: 'Moving', kind: 'info' }
}

// 파생 이벤트 생성(최근 몇 초 구간만)
function buildDerivedEvents({ wrapped, totalDuration, currentTime, fingerMap, sideLabel }) {
  if (!Array.isArray(wrapped) || wrapped.length === 0) return []

  const idxNow = indexAtTime(wrapped, currentTime)
  if (idxNow < 0) return []

  // lookback: 최근 6초 정도(샘플 밀도는 로그마다 다르니 최대 400개 제한)
  const LOOKBACK_SEC = 6
  const startT = Math.max(0, currentTime - LOOKBACK_SEC)

  const idxStart = Math.max(0, indexAtTime(wrapped, startT))
  const slice = wrapped.slice(idxStart, idxNow + 1).slice(-400)

  // finger 전체 joint idx 목록 (velocity spike 계산용)
  const allIdx = []
  for (const f of FINGERS) for (const j of fingerMap[f] || []) allIdx.push(j.idx)

  const out = []
  const VEL_WARN = 1.8 // rad/s
  const GAP_WARN_SEC = 1

  let prevSec = null
  for (let k = 0; k < slice.length; k++) {
    const w = slice[k]
    const msg = w?.msg ?? w
    const stamp = msg?.header?.stamp
    const sec = stamp?.sec ?? stamp?.secs ?? null
    const tSec = w?.tSec

    if (prevSec != null && sec != null) {
      const dt = sec - prevSec
      if (dt > GAP_WARN_SEC) {
        out.push({
          t: typeof tSec === 'number' ? tSec.toFixed(2) : '?',
          msg: `⚠️ [${sideLabel}] joint_states time gap ~${dt}s`,
          kind: 'warn'
        })
      }
    }
    if (sec != null) prevSec = sec

    let maxVel = 0
    for (const idx of allIdx) {
      const v = msg?.velocity?.[idx]
      if (typeof v === 'number') maxVel = Math.max(maxVel, Math.abs(v))
    }
    if (maxVel > VEL_WARN) {
      out.push({
        t: typeof tSec === 'number' ? tSec.toFixed(2) : '?',
        msg: `⚠️ [${sideLabel}] finger velocity spike: ${maxVel.toFixed(2)} rad/s`,
        kind: 'warn'
      })
    }
  }

  // rapid closure/open (0.5초 전 대비 변화량)
  const delta = computeHandCurlDelta(wrapped, totalDuration, fingerMap, currentTime, 0.5)
  if (typeof delta === 'number') {
    if (delta > 18) {
      out.push({
        t: currentTime.toFixed(2),
        msg: `⚠️ [${sideLabel}] rapid closure (+${delta.toFixed(0)}% / 0.5s)`,
        kind: 'warn'
      })
    } else if (delta < -18) {
      out.push({
        t: currentTime.toFixed(2),
        msg: `⚠️ [${sideLabel}] rapid opening (${delta.toFixed(0)}% / 0.5s)`,
        kind: 'warn'
      })
    }
  }

  // high asymmetry event (현재 시점 기준)
  const now = selectSampleAtTime(wrapped, currentTime, totalDuration)
  if (now) {
    const asym = computeAsymOnly(now, fingerMap)
    const avg = computeAvgCurlOnly(now, fingerMap)
    if (typeof asym === 'number' && asym >= 60 && (avg ?? 0) > 15) {
      out.push({
        t: currentTime.toFixed(2),
        msg: `⚠️ [${sideLabel}] high asymmetry (Δ=${asym.toFixed(0)}%)`,
        kind: 'warn'
      })
    }
  }

  return out.slice(-5)
}

// ✅ Avg Curl% + Asym% 시계열(현재시간 중심 슬라이딩 윈도우)
function buildCurlSeries({ wrapped, totalDuration, currentTime, fingerMap, windowSize }) {
  if (!Array.isArray(wrapped) || wrapped.length === 0) return []
  const idxNow = indexAtTime(wrapped, currentTime)
  if (idxNow < 0) return []

  // windowSize는 "포인트 수"로 사용(현재시간 중심)
  const N = Math.max(80, Number(windowSize || 240))
  const half = Math.floor(N / 2)
  const start = Math.max(0, idxNow - half)
  const end = Math.min(wrapped.length, idxNow + half)

  const slice = wrapped.slice(start, end)
  const series = []

  for (const w of slice) {
    const t = w?.tSec
    if (typeof t !== 'number') continue
    const msg = w?.msg ?? w
    const avg = computeAvgCurlOnly(msg, fingerMap)
    const asym = computeAsymOnly(msg, fingerMap)
    if (typeof avg !== 'number') continue
    series.push({
      t,
      avgCurl: avg,
      asym: typeof asym === 'number' ? asym : null
    })
  }
  return series
}

// ✅ 풀-타임라인 다운샘플 시리즈를 그대로 curl 시계열로 변환(슬라이딩 없이 전체 구간 표시)
function buildCurlSeriesFull(source, fingerMap) {
  if (!Array.isArray(source) || source.length === 0) return []
  const series = []
  for (const w of source) {
    const t = w?.tSec
    if (typeof t !== 'number') continue
    const msg = w?.msg ?? w
    const avg = computeAvgCurlOnly(msg, fingerMap)
    const asym = computeAsymOnly(msg, fingerMap)
    if (typeof avg !== 'number') continue
    series.push({ t, avgCurl: avg, asym: typeof asym === 'number' ? asym : null })
  }
  return series
}

function SafeResponsiveChart({ height = 170, children }) {
  const hostRef = useRef(null)
  const [width, setWidth] = useState(0)

  useEffect(() => {
    const el = hostRef.current
    if (!el) return

    const update = () => {
      const w = el.getBoundingClientRect?.().width ?? 0
      setWidth(w > 0 ? w : 0)
    }

    update()

    const ro = new ResizeObserver(update)
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  return (
    <div ref={hostRef} style={{ width: '100%', minWidth: 0, height, minHeight: height }}>
      {width > 0 ? (
        <ResponsiveContainer width={width} height={height}>
          {children}
        </ResponsiveContainer>
      ) : null}
    </div>
  )
}
/* ───────────────── main ───────────────── */

export default function EndEffectorTab({
  mcapSummary,
  jointGroups,
  currentTime = 0,
  windowSize = 240,
  isParsingMcap = false,
  mcapParseError = null
}) {
  const { t } = useTranslation('robot')
  const wrapped = mcapSummary?.samples?.['/joint_states'] ?? []
  const timeRange = mcapSummary?.timeRange ?? null
  // ✅ 차트 전용 풀-타임라인 시리즈(백그라운드 다운샘플). 준비되면 curl 차트를 전체 구간으로 표시.
  const chartTimeline = mcapSummary?.chartTimelineSamples ?? null
  const chartTimelineLoading = !!mcapSummary?.isChartTimelineLoading
  // 분석 임계값(추정 기준) — 설정 UI(⚙)에서 조정된 값.
  const handT = useAnalysisThresholds().hand

  const totalDuration = useMemo(() => {
    return timeRange?.startSec != null && timeRange?.endSec != null
      ? Math.max(0, timeRange.endSec - timeRange.startSec)
      : undefined
  }, [timeRange])

  const jointSamples = useMemo(() => wrapped.map((x) => x?.msg ?? x).filter(Boolean), [wrapped])

  const currentSample = useMemo(
    () => selectSampleAtTime(wrapped, currentTime, totalDuration),
    [wrapped, currentTime, totalDuration]
  )

  const names = currentSample?.name ?? []
  const leftMap = useMemo(() => buildFingerMapFromJointGroups(names, jointGroups, 'left'), [names, jointGroups])
  const rightMap = useMemo(() => buildFingerMapFromJointGroups(names, jointGroups, 'right'), [names, jointGroups])

  // 디버깅용 (필요 없으면 나중에 제거)
  //console.log('[EndEffectorTab][leftMap]', leftMap)
  //console.log('[EndEffectorTab][rightMap]', rightMap)

  // hand-level metrics at current time
  const leftMetrics = useMemo(
    () => computeHandMetrics(currentSample, jointSamples, leftMap, windowSize),
    [currentSample, jointSamples, leftMap, windowSize]
  )
  const rightMetrics = useMemo(
    () => computeHandMetrics(currentSample, jointSamples, rightMap, windowSize),
    [currentSample, jointSamples, rightMap, windowSize]
  )

  // deltas + states
  const leftDelta = useMemo(
    () => computeHandCurlDelta(wrapped, totalDuration, leftMap, currentTime, 0.4),
    [wrapped, totalDuration, leftMap, currentTime]
  )
  const rightDelta = useMemo(
    () => computeHandCurlDelta(wrapped, totalDuration, rightMap, currentTime, 0.4),
    [wrapped, totalDuration, rightMap, currentTime]
  )

  const leftState = useMemo(
    () => classifyHandState(leftMetrics.avgCurl, leftMetrics.handVrms, leftDelta, handT),
    [leftMetrics.avgCurl, leftMetrics.handVrms, leftDelta, handT]
  )
  const rightState = useMemo(
    () => classifyHandState(rightMetrics.avgCurl, rightMetrics.handVrms, rightDelta, handT),
    [rightMetrics.avgCurl, rightMetrics.handVrms, rightDelta, handT]
  )

  const leftEvents = useMemo(
    () =>
      buildDerivedEvents({
        wrapped,
        totalDuration,
        currentTime,
        fingerMap: leftMap,
        sideLabel: 'LH'
      }),
    [wrapped, totalDuration, currentTime, leftMap]
  )
  const rightEvents = useMemo(
    () =>
      buildDerivedEvents({
        wrapped,
        totalDuration,
        currentTime,
        fingerMap: rightMap,
        sideLabel: 'RH'
      }),
    [wrapped, totalDuration, currentTime, rightMap]
  )

  // ✅ Curl% timeline series
  //   - 풀-타임라인 다운샘플 준비됨 → 전체 구간 표시(슬라이딩 없음)
  //   - 아직 로드 전 → 현재시간 중심 슬라이딩 윈도우로 폴백
  // 풀-시리즈는 currentTime과 무관 → 별도 memo로 1회만 계산(재생 중 매 프레임 재계산 방지)
  const hasTimeline = Array.isArray(chartTimeline) && chartTimeline.length > 0
  const leftFull = useMemo(
    () => (hasTimeline ? buildCurlSeriesFull(chartTimeline, leftMap) : null),
    [hasTimeline, chartTimeline, leftMap]
  )
  const rightFull = useMemo(
    () => (hasTimeline ? buildCurlSeriesFull(chartTimeline, rightMap) : null),
    [hasTimeline, chartTimeline, rightMap]
  )
  const leftSeries = useMemo(
    () => leftFull ?? buildCurlSeries({ wrapped, totalDuration, currentTime, fingerMap: leftMap, windowSize }),
    [leftFull, wrapped, totalDuration, currentTime, leftMap, windowSize]
  )
  const rightSeries = useMemo(
    () => rightFull ?? buildCurlSeries({ wrapped, totalDuration, currentTime, fingerMap: rightMap, windowSize }),
    [rightFull, wrapped, totalDuration, currentTime, rightMap, windowSize]
  )

  function renderCurlChart(series, sideLabel) {
    // 전체 구간 차트 로딩 중에는 슬라이딩 윈도우를 잠깐 보여줬다 바꾸지 않고 로딩 표시 → 모양 급변 방지
    if (chartTimelineLoading && !hasTimeline) return safeNotice('info', t('replayControls.common.chartLoadingFull'))
    if (!series?.length) return safeNotice('warn', t('replayControls.tabs.endEffector.noCurlChartData'))
    return (
      <SafeResponsiveChart height={170}>
        <LineChart data={series}>
          {/* Arm 탭과 동일: 숫자 축 + domain → ReferenceLine(x=currentTime)이 정확히 위치 */}
          <XAxis
            dataKey="t"
            type="number"
            domain={['dataMin', 'dataMax']}
            tick={{ fontSize: 11 }}
            tickFormatter={(v) => formatKstTime(v, timeRange)}
          />
          <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} label={{ value: '%', angle: -90, position: 'insideLeft' }} />
          <Tooltip
            labelFormatter={(v) => `${formatKstTime(v, timeRange)}  (t=${Number(v).toFixed(2)}s)`}
            formatter={(val, name) => {
              const v = typeof val === 'number' ? `${val.toFixed(0)}%` : '-'
              const label = name === 'avgCurl' ? `${sideLabel} Avg Curl` : name === 'asym' ? `${sideLabel} Asym` : name
              return [v, label]
            }}
          />
          <ReferenceLine
            x={currentTime}
            stroke={theme.colors.accent ?? '#7B68EE'}
            strokeWidth={1.5}
            strokeDasharray="4 3"
            ifOverflow="extendDomain"
            label={{ value: '▼', position: 'top', fontSize: 10, fill: theme.colors.accent ?? '#7B68EE' }}
          />
          <Line
            type="monotone"
            dataKey="avgCurl"
            stroke={theme.colors.primary ?? '#2C9E9E'}
            dot={false}
            isAnimationActive={false}
            strokeWidth={2}
          />
          <Line
            type="monotone"
            dataKey="asym"
            stroke={theme.colors.textMuted ?? '#94A3B8'} // 연한색
            strokeDasharray="6 4" // 점선
            dot={false}
            isAnimationActive={false}
            strokeWidth={2}
            connectNulls
          />
        </LineChart>
      </SafeResponsiveChart>
    )
  }

  function renderHand(sideLabel, fingerMap, metrics, state, delta, events, series) {
    const asym = metrics.asym
    const asymWarn = typeof asym === 'number' && asym >= handT.asymWarnPct

    const headerRow = (
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
        <div style={{ ...UX.sectionTitle, marginBottom: 0 }}>
          {t('replayControls.tabs.endEffector.handMatrixTitle', {
            side: sideLabel === 'Left' ? t('replayControls.common.left') : t('replayControls.common.right')
          })}
        </div>
        <span style={{ fontSize: 11, color: theme.colors.textMuted }}>
          {rosStampToKstHms(currentSample?.header?.stamp)}
        </span>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {safeBadge(
            state.kind === 'ok' ? { ok: true } : state.kind === 'warn' ? { warn: true } : { ok: true },
            `Status: ${state.label}`
          )}
          {safeBadge({ ok: true }, `Avg ${metrics.avgCurl?.toFixed?.(0) ?? '-'}%`)}
          {safeBadge(asymWarn ? { warn: true } : { ok: true }, `Asym ${asym?.toFixed?.(0) ?? '-'}%`)}
          {safeBadge({ ok: true }, `vRMS ${metrics.handVrms?.toFixed?.(2) ?? '-'}`)}
        </div>
      </div>
    )

    return (
      <div style={UX.col}>
        {/* ── Matrix + Summary ── */}
        <div style={UX.card}>
          {headerRow}
          <div style={{ height: 8 }} />

          {FINGERS.map((f) => {
            const it = metrics.finger[f]
            const curl = it?.curl
            const vRms = it?.vRms

            const warn = typeof curl === 'number' && curl > handT.curlWarnPct

            return (
              <div key={f} style={UX.gaugeRow}>
                <span style={{ width: 70 }}>{f}</span>
                <div style={UX.bar}>
                  <div style={UX.fill(curl ?? 0)} />
                </div>

                <span style={{ fontSize: 10, color: warn ? theme.colors.statusWarn : theme.colors.textMuted }}>
                  {curl != null ? `${curl.toFixed(0)}%` : '-'}
                </span>
              </div>
            )
          })}

          <div style={{ marginTop: 8, fontSize: 10, color: theme.colors.textMuted }}>
            {t('replayControls.tabs.endEffector.footnoteGraspEstimate')}
          </div>
        </div>

        {/* ── NEW: Curl% Timeline ── */}
        <div style={UX.card}>
          <div style={UX.sectionTitle}>{t('replayControls.tabs.endEffector.curlTimelineTitle')}</div>
          {renderCurlChart(series, sideLabel === 'Left' ? 'LH' : 'RH')}
          <div style={{ marginTop: 8, fontSize: 10, color: theme.colors.textMuted }}>
            {t('replayControls.tabs.endEffector.footnoteCurlTimeline')}
          </div>
        </div>

        {/* ── Derived Events ── */}
        <div style={UX.card}>
          <div style={UX.sectionTitle}>{t('replayControls.tabs.endEffector.recentEventsTitle')}</div>
          {events.length === 0 ? (
            <div style={{ fontSize: 12, color: theme.colors.textMuted }}>{t('replayControls.common.noEvents')}</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {events.map((e, i) => (
                <div
                  key={i}
                  style={{
                    fontSize: 11,
                    padding: '6px 8px',
                    borderRadius: 10,
                    border: `1px solid ${theme.colors.border}`,
                    background: e.kind === 'warn' ? '#FFFBEB' : '#F9FAFB',
                    fontFamily: 'Consolas, ui-monospace, SFMono-Regular, Menlo, monospace'
                  }}
                >
                  <span style={{ color: theme.colors.textMuted }}>[t={e.t}s]</span> {e.msg}
                </div>
              ))}
            </div>
          )}
          <div style={{ marginTop: 8, fontSize: 10, color: theme.colors.textMuted }}>
            {t('replayControls.tabs.endEffector.footnoteEventsHeuristic')}
          </div>
        </div>
      </div>
    )
  }

  // ── gating ──────────────────────────────
  if (mcapParseError)
    return safeNotice(
      'error',
      t('replayControls.common.mcapParseError', { message: mcapParseError?.message ?? String(mcapParseError) })
    )
  if (isParsingMcap) return safeNotice('info', t('replayControls.common.mcapParsing'))
  if (!currentSample) return safeNotice('warn', t('replayControls.tabs.endEffector.noJointSampleFound'))

  return (
    <div style={UX.grid2}>
      {renderHand('Left', leftMap, leftMetrics, leftState, leftDelta, leftEvents, leftSeries)}
      {renderHand('Right', rightMap, rightMetrics, rightState, rightDelta, rightEvents, rightSeries)}
    </div>
  )
}
