// components/tabs/PerformanceTab.jsx
import React, { useMemo, useRef, useState, useEffect } from 'react'
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

function GuideHover({ content, label = 'Guide' }) {
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
        aria-label={label}
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
        ⓘ {label}
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
            * 마우스를 떼면 자동으로 닫힙니다.
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
      <div style={UX.noticePill('error')}>❌ MCAP parse error: {mcapParseError?.message ?? String(mcapParseError)}</div>
    )
  }
  if (isParsingMcap) return <div style={UX.noticePill('info')}>MCAP parsing...</div>

  const hasCtrl = Array.isArray(ctrlWrapped) && ctrlWrapped.length > 0
  const hasBatt = Array.isArray(battWrapped) && battWrapped.length > 0
  const chartTimelineLoading = !!mcapSummary?.isChartTimelineLoading
  const hasJsTimeline = Array.isArray(jsTimeline) && jsTimeline.length > 0

  return (
    <div style={UX.grid2}>
      {/* ── KPI: Target vs Actual ── */}
      <div style={UX.card}>
        <div style={UX.sectionTitle}>제어 성능 (Target vs Actual)</div>

        {!hasCtrl ? (
          <div style={UX.noticePill('warn')}>
            ⚠️ /tracking_controller/joint 샘플이 없습니다. (Target 기반 KPI/히스토그램이 제한됩니다.)
          </div>
        ) : !kpiNow ? (
          <div style={UX.noticePill('warn')}>⚠️ KPI 계산에 필요한 샘플을 찾지 못했습니다.</div>
        ) : (
          <>
            <div style={UX.kvRow}>
              <span style={UX.kvLabel}>Time</span>
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
              * Success 기준(|pos error| &lt; {kpiNow.posOkRad} rad)은 추정 기준입니다. (⚙에서 조정)
            </div>
          </>
        )}
      </div>

      {/* ── Time Distribution Histogram ── */}
      <div style={UX.card}>
        <div style={UX.sectionTitle}>시간 분포 (Histogram)</div>

        <div style={{ marginLeft: 'auto' }}>
          <GuideHover
            label="Guide"
            content={
              <div>
                <div style={{ fontWeight: 700, marginBottom: 6 }}>히스토그램 해석</div>
                <div style={{ display: 'grid', gap: 6 }}>
                  <div>
                    <b>posRMS↑</b>: 해당 구간에서 Target 대비 추종오차가 커짐
                  </div>
                  <div>
                    <b>success%↓</b>: 오차 기준(POS_OK)을 넘은 조인트 비율 증가
                  </div>
                  <div>
                    <b>연속으로 나쁨</b>: 지속 문제(튜닝/외란/하드웨어) 가능
                  </div>
                  <div>
                    <b>일부 bin만 튐</b>: 순간 이벤트(급동작/모드 전환 등) 가능
                  </div>
                  <div>
                    <b>samples가 적음</b>: 대표성 낮아 해석 주의
                  </div>
                  <div style={{ color: theme.colors.textMuted, fontSize: 11 }}>
                    세로선(ReferenceLine)은 현재 재생 시간입니다.
                  </div>
                </div>
              </div>
            }
          />
        </div>

        {chartTimelineLoading && !hasJsTimeline ? (
          // 전체 구간 데이터 로딩 중에는 일부 bin만 찬 히스토그램을 보여줬다 바꾸지 않고 로딩 표시
          <div style={UX.noticePill('info')}>전체 구간 차트 불러오는 중…</div>
        ) : !hasCtrl ? (
          <div style={UX.noticePill('warn')}>
            ⚠️ /tracking_controller/joint 샘플이 없어 히스토그램을 만들 수 없습니다.
          </div>
        ) : !timeHist?.length ? (
          <div style={UX.noticePill('warn')}>⚠️ 히스토그램을 만들 데이터가 부족합니다. (샘플/시간범위 확인)</div>
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
                    if (p?.t0 != null && p?.t1 != null) return `구간: ${p.t0.toFixed(1)}~${p.t1.toFixed(1)}s`
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
              * 각 막대는 해당 시간 구간에서의 평균 posRMS / 평균 success% 입니다. (ReferenceLine = currentTime)
            </div>
          </>
        )}
      </div>

      {/* ── Issue Summary ── */}
      <div style={UX.card}>
        <div style={UX.sectionTitle}>이슈 요약 (diagnostic/actuator 기반)</div>

        {issueSummary.length === 0 ? (
          <div style={{ fontSize: 12, color: theme.colors.textMuted }}>표시할 이슈가 없습니다.</div>
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
          * CPU/메모리 같은 리소스 값은 별도 토픽이 필요합니다. 전력은 우측 배터리 카드를 참고하세요.
        </div>
      </div>

      {/* ── Battery / Power ── */}
      <div style={UX.card}>
        <div style={UX.sectionTitle}>전력/배터리 (Battery)</div>

        {!hasBatt ? (
          <div style={UX.noticePill('warn')}>⚠️ /battery/battery_status 샘플이 없습니다.</div>
        ) : !battInfo ? (
          <div style={UX.noticePill('warn')}>⚠️ battery 메시지를 해석할 수 없습니다.</div>
        ) : (
          <>
            <div style={UX.kvRow}>
              <span style={UX.kvLabel}>Time</span>
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
              * sensor_msgs/BatteryState 기준. percentage는 0~1 규약을 %로 환산해 표시합니다.
              {powerEvents.length > 0 && ` · 전력/안전 이벤트 ${powerEvents.length}건(rosout)`}
              {' · 과방전 등 보호 이벤트는 BatteryState가 아닌 rosout(safety) 로그입니다.'}
            </div>
          </>
        )}
      </div>

      {/* ── (Optional) Raw stats small note ── */}
      <div style={UX.card}>
        <div style={UX.sectionTitle}>데이터 상태</div>

        <details style={{ marginTop: 6 }}>
          <summary style={{ cursor: 'pointer', fontSize: 12, color: theme.colors.textMuted }}>
            개발자용 샘플 카운트 보기
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
