// components/tabs/PerformanceTab.jsx
import React, { useMemo, useRef, useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { UX, theme } from '../../styles'
import { rosStampToKstHms, tSecToKstHms } from '@/utils/dateUtils'
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, ReferenceLine } from 'recharts'
import { selectSampleAtTime } from '../../utils/sampleSelect'
import { useAnalysisThresholds } from '../../AnalysisThresholdsContext'
import {
  DIAGNOSTIC_TOPICS,
  ACTUATOR_TOPICS,
  BATTERY_TOPICS,
  ROSOUT_TOPICS,
  DIAGNOSTIC_FALLBACK,
  ACTUATOR_FALLBACK,
  BATTERY_FALLBACK,
  ROSOUT_FALLBACK,
  resolveTopicSamples
} from '../../utils/topics'

// sensor_msgs/msg/BatteryState.power_supply_status (uint8) → 라벨
const PSU_STATUS = { 0: 'Unknown', 1: 'Charging', 2: 'Discharging', 3: 'Not charging', 4: 'Full' }
// sensor_msgs/msg/BatteryState.power_supply_health (uint8) → 라벨
const PSU_HEALTH = {
  0: 'Unknown',
  1: 'Good',
  2: 'Overheat',
  3: 'Dead',
  4: 'Overvoltage',
  5: 'Unspec failure',
  6: 'Cold',
  7: 'Watchdog timeout',
  8: 'Safety timeout'
}
// health가 "정상/미상"이 아니면(=결함) 경고색으로 표시
const isBadHealth = (h) => typeof h === 'number' && h !== 0 && h !== 1

// rosout Log.level 중 ERROR/FATAL (ROS1: 8/16, ROS2: 40/50)
const isRosoutErrLevel = (lv) => lv === 8 || lv === 16 || lv === 40 || lv === 50
// 전력/안전 관련 이벤트로 볼 노드명/메시지 키워드 (과방전 등은 BatteryState가 아닌 rosout에만 존재)
const POWER_EVENT_RE = /safety|battery|bms|power|전력|전압|방전|과충전|과방전|배터리/i

/* ───────────────── helpers ───────────────── */

function GuideHover({ content, label }) {
  const { t } = useTranslation('robot')
  const resolvedLabel = label ?? t('replayControls.tabs.performance.guideLabel')
  const [open, setOpen] = React.useState(false)

  return (
    <div
      style={{ position: 'relative', display: 'inline-flex', alignItems: 'center' }}
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
      onFocus={() => setOpen(true)}
      onBlur={() => setOpen(false)}
    >
      <button
        type="button"
        aria-label={resolvedLabel}
        style={{
          cursor: 'help',
          border: `1px solid ${theme.colors.border}`,
          background: '#fff',
          borderRadius: 999,
          padding: '2px 8px',
          fontSize: 11,
          color: theme.colors.textMuted,
          display: 'inline-flex',
          alignItems: 'center',
          gap: 6
        }}
      >
        ⓘ {resolvedLabel}
      </button>

      {open && (
        <div
          role="tooltip"
          style={{
            position: 'absolute',
            zIndex: 50,
            top: 'calc(100% + 6px)',
            right: 0,
            width: 360,
            maxWidth: '70vw',
            padding: 10,
            borderRadius: 10,
            border: `1px solid ${theme.colors.border}`,
            background: '#fff',
            boxShadow: '0 8px 20px rgba(0,0,0,0.08)',
            fontSize: 12,
            lineHeight: 1.55,
            color: theme.colors.text
          }}
        >
          {content}
          <div style={{ marginTop: 8, fontSize: 11, color: theme.colors.textMuted }}>
            {t('replayControls.tabs.performance.guideAutoCloseHint')}
          </div>
        </div>
      )}
    </div>
  )
}

function getWrappedMsg(w) {
  return w?.msg ?? w ?? null
}
function getWrappedTSec(w) {
  const t = w?.tSec
  return typeof t === 'number' ? t : null
}

// ctrlWrapped에서 tSec <= targetTime 인 마지막 인덱스를 1-pass로 진전
function advanceCtrlIndex(ctrlWrapped, startIdx, targetTime) {
  let i = startIdx
  while (i + 1 < ctrlWrapped.length) {
    const nt = getWrappedTSec(ctrlWrapped[i + 1])
    if (typeof nt === 'number' && nt <= targetTime) i++
    else break
  }
  return i
}

function makeIndexByName(names = []) {
  const map = new Map()
  for (let i = 0; i < names.length; i++) {
    const n = names[i]
    if (typeof n === 'string') map.set(n, i)
  }
  return map
}

// joint_states(actual) vs tracking_controller(target) 한 시점 KPI
function computeTrackKpiAtTime(jsMsg, ctrlMsg, POS_OK = 0.15) {
  if (!jsMsg || !ctrlMsg) return null

  const jsNames = Array.isArray(jsMsg.name) ? jsMsg.name : []
  const jsPos = jsMsg.position
  const jsVel = jsMsg.velocity

  const ctrlNames = Array.isArray(ctrlMsg.name) ? ctrlMsg.name : []
  const tgtPos = ctrlMsg.target_position
  const tgtVel = ctrlMsg.target_velocity
  const maxVel = ctrlMsg.max_velocity

  const idxByName = makeIndexByName(jsNames)

  let sumSq = 0
  let n = 0
  let ok = 0
  let peak = 0

  for (let i = 0; i < ctrlNames.length; i++) {
    const name = ctrlNames[i]
    const idx = idxByName.get(name)
    if (idx == null) continue

    const ap = typeof jsPos?.[idx] === 'number' ? jsPos[idx] : null
    const tp = typeof tgtPos?.[i] === 'number' ? tgtPos[i] : null
    if (ap == null || tp == null) continue

    const e = ap - tp
    sumSq += e * e
    n++
    peak = Math.max(peak, Math.abs(e))
    if (Math.abs(e) <= POS_OK) ok++
  }

  if (!n) return null
  const posRms = Math.sqrt(sumSq / n)
  const successPct = (ok / n) * 100

  return { posRms, peak, n, successPct }
}

// ✅ 시간 구간(histogram) 생성 (시간 분포)
function buildTimeHistogram({ jsWrapped, ctrlWrapped, duration, bins = 30, POS_OK = 0.15 }) {
  if (!Array.isArray(jsWrapped) || jsWrapped.length === 0) return []
  if (!Array.isArray(ctrlWrapped) || ctrlWrapped.length === 0) return []

  const dur = Number(duration || 0)
  if (!(dur > 0)) return []

  const N = Math.max(8, Number(bins || 30))
  const dt = dur / N

  const acc = Array.from({ length: N }, (_, b) => ({
    b,
    t0: b * dt,
    t1: (b + 1) * dt,
    rmsSum: 0,
    rmsN: 0,
    succSum: 0,
    succN: 0,
    peakMax: 0,
    samples: 0
  }))

  // ctrl 포인터 1-pass (두 배열이 시간순 정렬되어 있다고 가정: loader에서 sort됨)
  let ci = 0

  for (let k = 0; k < jsWrapped.length; k++) {
    const jw = jsWrapped[k]
    const t = getWrappedTSec(jw)
    if (typeof t !== 'number') continue
    if (t < 0 || t > dur) continue

    ci = advanceCtrlIndex(ctrlWrapped, ci, t)

    const cw = ctrlWrapped[ci]
    const jsMsg = getWrappedMsg(jw)
    const ctrlMsg = getWrappedMsg(cw)

    const kpi = computeTrackKpiAtTime(jsMsg, ctrlMsg, POS_OK)
    if (!kpi) continue

    const b = Math.min(N - 1, Math.max(0, Math.floor(t / dt)))
    const a = acc[b]
    a.samples += 1

    // bin 내 "샘플별 posRms" 평균
    a.rmsSum += kpi.posRms
    a.rmsN += 1

    // bin 내 "샘플별 successPct" 평균
    a.succSum += kpi.successPct
    a.succN += 1

    // bin 내 peak는 max
    a.peakMax = Math.max(a.peakMax, kpi.peak)
  }

  return acc.map((a) => {
    const posRms = a.rmsN ? a.rmsSum / a.rmsN : null
    const successPct = a.succN ? a.succSum / a.succN : null
    const tMid = (a.t0 + a.t1) / 2

    return {
      b: a.b,
      t0: a.t0,
      t1: a.t1,
      tMid,
      posRms,
      successPct,
      peak: a.peakMax || null,
      samples: a.samples
    }
  })
}

function SafeResponsiveChart({ height = 230, children }) {
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

// diagnostic 메시지 정규화 (DiagnosticArray/DiagnosticStatus)
function normalizeDiagnostics(msg) {
  if (!msg) return []
  if (Array.isArray(msg.status)) return msg.status.filter(Boolean)
  if (typeof msg.level === 'number' || msg.name || msg.message) return [msg]
  return []
}

/* ───────────────── main ───────────────── */

export default function PerformanceTab({
  data, // unused (kept for compatibility)
  mcapSummary,
  currentTime = 0,
  totalDuration,
  isParsingMcap = false,
  mcapParseError = null
}) {
  const { t } = useTranslation('robot')
  const samples = mcapSummary?.samples || {}
  const timeRange = mcapSummary?.timeRange || null

  const duration = useMemo(() => {
    if (Number.isFinite(totalDuration)) return Number(totalDuration)
    if (timeRange && Number.isFinite(timeRange.startSec) && Number.isFinite(timeRange.endSec)) {
      return Math.max(0, timeRange.endSec - timeRange.startSec)
    }
    return 0
  }, [totalDuration, timeRange])

  const jsWrapped = samples['/joint_states'] || []
  // ✅ 차트 전용 풀-타임라인 joint_states(다운샘플). 히스토그램은 전체 구간 bin을 채워야 하므로 이걸 사용.
  const jsTimeline = mcapSummary?.chartTimelineSamples ?? null
  const ctrlWrapped = samples['/tracking_controller/joint'] || []
  // actuator/diagnostic은 구·신 토픽 이름을 모두 지원하도록 해석 유틸 사용
  const actWrapped = resolveTopicSamples(samples, ACTUATOR_TOPICS, ACTUATOR_FALLBACK)
  const diagWrapped = resolveTopicSamples(samples, DIAGNOSTIC_TOPICS, DIAGNOSTIC_FALLBACK)
  const battWrapped = resolveTopicSamples(samples, BATTERY_TOPICS, BATTERY_FALLBACK)

  const js = useMemo(() => selectSampleAtTime(jsWrapped, currentTime, duration), [jsWrapped, currentTime, duration])
  const ctrl = useMemo(
    () => selectSampleAtTime(ctrlWrapped, currentTime, duration),
    [ctrlWrapped, currentTime, duration]
  )
  const act = useMemo(() => selectSampleAtTime(actWrapped, currentTime, duration), [actWrapped, currentTime, duration])
  const diag = useMemo(
    () => selectSampleAtTime(diagWrapped, currentTime, duration),
    [diagWrapped, currentTime, duration]
  )
  const batt = useMemo(
    () => selectSampleAtTime(battWrapped, currentTime, duration),
    [battWrapped, currentTime, duration]
  )

  // ✅ 배터리/전력 현재 시점 요약 (sensor_msgs/msg/BatteryState)
  const battInfo = useMemo(() => {
    if (!batt) return null
    const num = (v) => (typeof v === 'number' && Number.isFinite(v) ? v : null)
    const pctRaw = num(batt.percentage)
    // percentage는 0.0~1.0 규약. 일부 구현은 0~100으로 보냄 → >1 이면 이미 % 로 간주
    const pct = pctRaw == null ? null : pctRaw <= 1 ? pctRaw * 100 : pctRaw
    const health = typeof batt.power_supply_health === 'number' ? batt.power_supply_health : null
    return {
      pct,
      voltage: num(batt.voltage),
      current: num(batt.current),
      temperature: num(batt.temperature),
      status: PSU_STATUS[batt.power_supply_status] ?? null,
      health,
      healthLabel: health == null ? null : (PSU_HEALTH[health] ?? `code ${health}`),
      healthBad: isBadHealth(health),
      stamp: batt?.header?.stamp ? rosStampToKstHms(batt.header.stamp) : '-'
    }
  }, [batt])

  // ✅ (B) 전력/안전 관련 rosout ERROR/FATAL 이벤트 — 과방전 등은 BatteryState가 아닌 rosout에만 존재.
  // rosout은 Phase2에서 전수(소량) 로드되므로 samples로 충분.
  const rosoutWrapped = resolveTopicSamples(samples, ROSOUT_TOPICS, ROSOUT_FALLBACK)
  const powerEvents = useMemo(() => {
    const arr = Array.isArray(rosoutWrapped) ? rosoutWrapped : []
    const out = []
    for (const s of arr) {
      const tSec = s?.tSec ?? s?.t
      const msg = s?.msg ?? s?.raw ?? null
      if (!Number.isFinite(tSec) || !msg) continue
      if (!isRosoutErrLevel(msg.level)) continue
      const name = String(msg.name ?? '')
      const text = String(msg.msg ?? msg.message ?? '')
      if (!POWER_EVENT_RE.test(name) && !POWER_EVENT_RE.test(text)) continue
      out.push({ tSec, name, text })
    }
    out.sort((a, b) => a.tSec - b.tSec)
    return out
  }, [rosoutWrapped])

  // 현재 시점(이하) 가장 최근의 전력/안전 이벤트(래치) — 배터리 카드에 연계 표시
  const activePowerEvent = useMemo(() => {
    let last = null
    for (const e of powerEvents) {
      if (e.tSec <= currentTime) last = e
      else break
    }
    return last
  }, [powerEvents, currentTime])

  // ✅ KPI(현재 시점) : Target vs Actual
  // 분석 임계값(추정 기준) — 설정 UI(⚙)에서 조정된 값.
  const perfT = useAnalysisThresholds().perf

  const kpiNow = useMemo(() => {
    const POS_OK = perfT.posOkRad // 성공 기준(추정) — 설정 UI에서 조정
    const out = computeTrackKpiAtTime(js, ctrl, POS_OK)
    if (!out) return null
    return {
      ...out,
      stamp: js?.header?.stamp ? rosStampToKstHms(js.header.stamp) : '-',
      posOkRad: POS_OK
    }
  }, [js, ctrl, perfT])

  // ✅ 시간 분포 히스토그램 (bin별 평균 posRms / successPct)
  //   - 풀-타임라인 다운샘플(jsTimeline)이 준비되면 전체 구간 bin을 채움
  //   - 아직 로드 전이면 ±2초 윈도우(jsWrapped)로 폴백(현재 시점 근처 bin만 채워짐)
  const timeHist = useMemo(() => {
    const jsForHist = Array.isArray(jsTimeline) && jsTimeline.length > 0 ? jsTimeline : jsWrapped
    return buildTimeHistogram({
      jsWrapped: jsForHist,
      ctrlWrapped,
      duration,
      bins: 30,
      POS_OK: perfT.posOkRad
    })
  }, [jsTimeline, jsWrapped, ctrlWrapped, duration, perfT])

  // ✅ 이슈 요약(가볍게): actuator + diagnostic
  const issueSummary = useMemo(() => {
    const out = []

    if (act) {
      const servo = act.servo_on
      const err = act.error_code
      const n = Math.max(servo?.length || 0, err?.length || 0)
      let servoOff = 0
      let errCnt = 0
      for (let i = 0; i < n; i++) {
        const s = typeof servo?.[i] === 'number' ? servo[i] : null
        const e = typeof err?.[i] === 'number' ? err[i] : null
        if (s != null && s === 0) servoOff++
        if (e != null && e !== 0) errCnt++
      }
      if (errCnt > 0) out.push(`❌ Actuator error joints: ${errCnt}`)
      if (servoOff > 0) out.push(`⚠️ Servo OFF joints: ${servoOff}`)
    }

    if (diag) {
      const sts = normalizeDiagnostics(diag)
      const err = sts.filter((s) => s?.level === 2).length
      if (err > 0) out.push(`❌ Diagnostic ERROR: ${err}`)
    }

    return out
  }, [act, diag])

  // ── gating ──────────────────────────────
  if (mcapParseError) {
    return (
      <div style={UX.noticePill('error')}>
        {t('replayControls.common.mcapParseError', { message: mcapParseError?.message ?? String(mcapParseError) })}
      </div>
    )
  }
  if (isParsingMcap) return <div style={UX.noticePill('info')}>{t('replayControls.common.mcapParsing')}</div>

  const hasCtrl = Array.isArray(ctrlWrapped) && ctrlWrapped.length > 0
  const hasBatt = Array.isArray(battWrapped) && battWrapped.length > 0
  const chartTimelineLoading = !!mcapSummary?.isChartTimelineLoading
  const hasJsTimeline = Array.isArray(jsTimeline) && jsTimeline.length > 0

  return (
    <div style={UX.grid2}>
      {/* ── KPI: Target vs Actual ── */}
      <div style={UX.card}>
        <div style={UX.sectionTitle}>{t('replayControls.tabs.performance.controlPerfTitle')}</div>

        {!hasCtrl ? (
          <div style={UX.noticePill('warn')}>{t('replayControls.tabs.performance.noTrackingSample')}</div>
        ) : !kpiNow ? (
          <div style={UX.noticePill('warn')}>{t('replayControls.tabs.performance.noKpiSample')}</div>
        ) : (
          <>
            <div style={UX.kvRow}>
              <span style={UX.kvLabel}>{t('replayControls.common.time')}</span>
              <span style={UX.badge({ ok: true })}>{kpiNow.stamp}</span>
              <span style={UX.kvSub}>t={Number(currentTime || 0).toFixed(2)}s</span>
            </div>

            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 8 }}>
              <span style={UX.badge({ ok: true })}>Success {kpiNow.successPct.toFixed(0)}%</span>
              <span style={UX.badge({ ok: true })}>pos RMS {kpiNow.posRms.toFixed(3)}</span>
              <span style={UX.badge({ warn: kpiNow.peak > perfT.peakWarnRad, ok: true })}>
                pos peak {kpiNow.peak.toFixed(3)}
              </span>
            </div>

            <div style={{ marginTop: 10, fontSize: 11, color: theme.colors.textMuted }}>
              {t('replayControls.tabs.performance.footnoteSuccessCriteria', { posOkRad: kpiNow.posOkRad })}
            </div>
          </>
        )}
      </div>

      {/* ── Time Distribution Histogram ── */}
      <div style={UX.card}>
        <div style={UX.sectionTitle}>{t('replayControls.tabs.performance.histogramTitle')}</div>

        <div style={{ marginLeft: 'auto' }}>
          <GuideHover
            content={
              <div>
                <div style={{ fontWeight: 700, marginBottom: 6 }}>
                  {t('replayControls.tabs.performance.histogramGuideTitle')}
                </div>
                <div style={{ display: 'grid', gap: 6 }}>
                  <div>
                    <b>{t('replayControls.tabs.performance.histogramGuidePosRmsLabel')}</b>:{' '}
                    {t('replayControls.tabs.performance.histogramGuidePosRmsDesc')}
                  </div>
                  <div>
                    <b>{t('replayControls.tabs.performance.histogramGuideSuccessLabel')}</b>:{' '}
                    {t('replayControls.tabs.performance.histogramGuideSuccessDesc')}
                  </div>
                  <div>
                    <b>{t('replayControls.tabs.performance.histogramGuideContinuousLabel')}</b>:{' '}
                    {t('replayControls.tabs.performance.histogramGuideContinuousDesc')}
                  </div>
                  <div>
                    <b>{t('replayControls.tabs.performance.histogramGuideSpikeLabel')}</b>:{' '}
                    {t('replayControls.tabs.performance.histogramGuideSpikeDesc')}
                  </div>
                  <div>
                    <b>{t('replayControls.tabs.performance.histogramGuideLowSamplesLabel')}</b>:{' '}
                    {t('replayControls.tabs.performance.histogramGuideLowSamplesDesc')}
                  </div>
                  <div style={{ color: theme.colors.textMuted, fontSize: 11 }}>
                    {t('replayControls.tabs.performance.histogramGuideRefLine')}
                  </div>
                </div>
              </div>
            }
          />
        </div>

        {chartTimelineLoading && !hasJsTimeline ? (
          // 전체 구간 데이터 로딩 중에는 일부 bin만 찬 히스토그램을 보여줬다 바꾸지 않고 로딩 표시
          <div style={UX.noticePill('info')}>{t('replayControls.common.chartLoadingFull')}</div>
        ) : !hasCtrl ? (
          <div style={UX.noticePill('warn')}>{t('replayControls.tabs.performance.noTrackingForHistogram')}</div>
        ) : !timeHist?.length ? (
          <div style={UX.noticePill('warn')}>{t('replayControls.tabs.performance.notEnoughHistogramData')}</div>
        ) : (
          <>
            <SafeResponsiveChart height={230}>
              <BarChart data={timeHist} margin={{ top: 10, right: 10, left: 0, bottom: 10 }}>
                <CartesianGrid strokeDasharray="3 3" />

                {/* ✅ 숫자 축 사용: ReferenceLine x=currentTime 정확히 동작 */}
                <XAxis
                  type="number"
                  dataKey="tMid"
                  domain={[0, duration]}
                  tickFormatter={(v) => `${Number(v).toFixed(0)}s`}
                  tick={{ fontSize: 11 }}
                />

                <YAxis
                  yAxisId="left"
                  tick={{ fontSize: 11 }}
                  label={{ value: 'posRMS(rad)', angle: -90, position: 'insideLeft' }}
                />
                <YAxis
                  yAxisId="right"
                  orientation="right"
                  domain={[0, 100]}
                  tick={{ fontSize: 11 }}
                  label={{ value: 'success(%)', angle: -90, position: 'insideRight' }}
                />

                <Tooltip
                  labelFormatter={(v, payload) => {
                    const p = payload?.[0]?.payload
                    if (p?.t0 != null && p?.t1 != null) {
                      return t('replayControls.tabs.performance.histogramTooltipRange', {
                        t0: p.t0.toFixed(1),
                        t1: p.t1.toFixed(1)
                      })
                    }
                    return `t≈${Number(v).toFixed(2)}s`
                  }}
                  formatter={(val, name, item) => {
                    const p = item?.payload
                    if (name === 'posRms') return [typeof val === 'number' ? val.toFixed(3) : '-', 'posRMS']
                    if (name === 'successPct') return [typeof val === 'number' ? `${val.toFixed(0)}%` : '-', 'success%']
                    if (name === 'samples') return [p?.samples ?? '-', 'samples']
                    return [val, name]
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

                {/* posRMS 막대 */}
                <Bar yAxisId="left" dataKey="posRms" fill={theme.colors.primary ?? '#2C9E9E'} />

                {/* success%는 같은 x에 겹쳐서(투명) 표시 */}
                <Bar yAxisId="right" dataKey="successPct" fill={theme.colors.statusOk ?? '#10B981'} opacity={0.35} />
              </BarChart>
            </SafeResponsiveChart>

            <div style={{ marginTop: 8, fontSize: 11, color: theme.colors.textMuted }}>
              {t('replayControls.tabs.performance.footnoteHistogramBars')}
            </div>
          </>
        )}
      </div>

      {/* ── Issue Summary ── */}
      <div style={UX.card}>
        <div style={UX.sectionTitle}>{t('replayControls.tabs.performance.issueSummaryTitle')}</div>

        {issueSummary.length === 0 ? (
          <div style={{ fontSize: 12, color: theme.colors.textMuted }}>
            {t('replayControls.tabs.performance.noIssues')}
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {issueSummary.map((t, i) => (
              <div key={i} style={UX.cmdItem({ warn: t.startsWith('⚠️'), error: t.startsWith('❌') })}>
                {t}
              </div>
            ))}
          </div>
        )}

        <div style={{ marginTop: 10, fontSize: 11, color: theme.colors.textMuted }}>
          {t('replayControls.tabs.performance.footnoteResourceNote')}
        </div>
      </div>

      {/* ── Battery / Power ── */}
      <div style={UX.card}>
        <div style={UX.sectionTitle}>{t('replayControls.tabs.performance.batteryTitle')}</div>

        {!hasBatt ? (
          <div style={UX.noticePill('warn')}>{t('replayControls.tabs.performance.noBatterySample')}</div>
        ) : !battInfo ? (
          <div style={UX.noticePill('warn')}>{t('replayControls.tabs.performance.batteryParseFail')}</div>
        ) : (
          <>
            <div style={UX.kvRow}>
              <span style={UX.kvLabel}>{t('replayControls.common.time')}</span>
              <span style={UX.badge({ ok: true })}>{battInfo.stamp}</span>
              <span style={UX.kvSub}>t={Number(currentTime || 0).toFixed(2)}s</span>
            </div>

            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 8 }}>
              {battInfo.pct != null && (
                <span style={UX.badge({ warn: battInfo.pct < 20, ok: battInfo.pct >= 20 })}>
                  {battInfo.pct.toFixed(0)}%
                </span>
              )}
              {battInfo.voltage != null && <span style={UX.badge({ ok: true })}>{battInfo.voltage.toFixed(2)} V</span>}
              {battInfo.current != null && <span style={UX.badge({ ok: true })}>{battInfo.current.toFixed(2)} A</span>}
              {battInfo.temperature != null && (
                <span style={UX.badge({ ok: true })}>{battInfo.temperature.toFixed(1)} °C</span>
              )}
              {battInfo.status && <span style={UX.badge({ ok: true })}>{battInfo.status}</span>}
              {battInfo.healthLabel && (
                <span style={UX.badge({ warn: battInfo.healthBad, ok: !battInfo.healthBad })}>
                  health: {battInfo.healthLabel}
                </span>
              )}
            </div>

            {/* (B) 전력/안전 관련 rosout 이벤트(과방전 등) — 현재 시점 기준 최근 이벤트 연계 */}
            {activePowerEvent && (
              <div style={{ ...UX.cmdItem({ error: true }), marginTop: 10 }}>
                {activePowerEvent.text}
                <span style={{ color: theme.colors.textMuted }}>
                  {' '}
                  ({activePowerEvent.name || 'rosout'} @ {tSecToKstHms(activePowerEvent.tSec, timeRange)})
                </span>
              </div>
            )}

            <div style={{ marginTop: 10, fontSize: 11, color: theme.colors.textMuted }}>
              {t('replayControls.tabs.performance.footnoteBatteryNote')}
              {powerEvents.length > 0 &&
                t('replayControls.tabs.performance.powerEventsSuffix', { count: powerEvents.length })}
              {t('replayControls.tabs.performance.footnoteSafetyNote')}
            </div>
          </>
        )}
      </div>

      {/* ── (Optional) Raw stats small note ── */}
      <div style={UX.card}>
        <div style={UX.sectionTitle}>{t('replayControls.tabs.performance.dataStatusTitle')}</div>

        <details style={{ marginTop: 6 }}>
          <summary style={{ cursor: 'pointer', fontSize: 12, color: theme.colors.textMuted }}>
            {t('replayControls.tabs.performance.devSampleCountToggle')}
          </summary>
          <div
            style={{
              marginTop: 8,
              fontSize: 12,
              color: theme.colors.textMuted,
              display: 'flex',
              flexDirection: 'column',
              gap: 6
            }}
          >
            <div>joint_states samples: {Array.isArray(jsWrapped) ? jsWrapped.length : 0}</div>
            <div>tracking_controller samples: {Array.isArray(ctrlWrapped) ? ctrlWrapped.length : 0}</div>
            <div>actuator_states samples: {Array.isArray(actWrapped) ? actWrapped.length : 0}</div>
            <div>diagnostic samples: {Array.isArray(diagWrapped) ? diagWrapped.length : 0}</div>
            <div>battery samples: {Array.isArray(battWrapped) ? battWrapped.length : 0}</div>
          </div>
        </details>
      </div>
    </div>
  )
}
