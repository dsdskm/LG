// ArmAnalysisTab.jsx (A안: tSec=상대초 기준 전체 교체본)
import React, { useMemo, useEffect, useRef, useState } from 'react'
import { theme, UX } from '../../styles'
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, ReferenceLine } from 'recharts'
import { rosStampToKstHms } from '@/utils/dateUtils'
import { selectSampleAtTime, indexAtTime } from '../../utils/sampleSelect'
import { useAnalysisThresholds } from '../../AnalysisThresholdsContext'
import { DEFAULT_ANALYSIS_THRESHOLDS } from '../../analysisConfig'
import { Dropdown } from '@repo/ui'
import { resolveTopicSamples, TRACKING_TOPICS, TRACKING_FALLBACK } from '../../utils/topics'
/* ───────────────── helpers ───────────────── */

// 모듈 스코프 헬퍼(컴포넌트 밖)는 context를 못 읽으므로 UI 비노출 기본값을 사용.
const ARM_DEF = DEFAULT_ANALYSIS_THRESHOLDS.arm

// rad → deg
const rad2deg = (r) => (typeof r === 'number' ? (r * 180) / Math.PI : null)

function getArmJointIndices(names = [], side = 'left') {
  const re = side === 'right' ? /^right_joint_(\d+)$/i : /^left_joint_(\d+)$/i
  const pairs = []
  for (let i = 0; i < names.length; i++) {
    const m = re.exec(String(names[i] ?? ''))
    if (!m) continue
    const jn = Number(m[1])
    pairs.push({ idx: i, jn })
  }

  // ✅ fallback
  if (pairs.length === 0) {
    return names.map((_, idx) => idx)
  }

  pairs.sort((a, b) => a.jn - b.jn)
  return pairs.map((p) => p.idx)
}

// 간단한 안정성 지표: 최근 window에서 vel RMS, effort RMS 계산
function computeStability(samples, idxs, windowSize = 120) {
  if (!Array.isArray(samples) || samples.length < 2 || !idxs?.length) return null
  const tail = samples.slice(Math.max(0, samples.length - windowSize))

  let velSqSum = 0
  let effSqSum = 0
  let nVel = 0
  let nEff = 0
  let velPeak = 0
  let effPeak = 0

  for (const s of tail) {
    const v = s?.velocity
    const e = s?.effort
    for (const idx of idxs) {
      const vv = typeof v?.[idx] === 'number' ? v[idx] : null
      const ee = typeof e?.[idx] === 'number' ? e[idx] : null
      if (vv != null) {
        velSqSum += vv * vv
        nVel += 1
        velPeak = Math.max(velPeak, Math.abs(vv))
      }
      if (ee != null) {
        effSqSum += ee * ee
        nEff += 1
        effPeak = Math.max(effPeak, Math.abs(ee))
      }
    }
  }

  const velRms = nVel > 0 ? Math.sqrt(velSqSum / nVel) : null
  const effRms = nEff > 0 ? Math.sqrt(effSqSum / nEff) : null

  // velRms가 작을수록 100에 가까움(보수적 매핑)
  const smoothPct = velRms != null ? Math.max(0, Math.min(100, 100 * Math.exp(-ARM_DEF.smoothnessK * velRms))) : null

  return { velRms, effRms, velPeak, effPeak, smoothPct }
}


// 이벤트 로그(명령 대신) : spike / gap 등 joint_states 기반 자동 생성

function buildDerivedEvents(slice, idxs, sideLabel) {
  if (!Array.isArray(slice) || slice.length === 0 || !idxs?.length) return []

  const out = []
  const VEL_WARN = ARM_DEF.eventVelWarn // rad/s
  const EFF_WARN = ARM_DEF.eventEffWarn // effort 단위

  let prevSec = null
  for (let k = 0; k < slice.length; k++) {
    const s = slice[k]
    const stamp = s?.header?.stamp
    const t = rosStampToKstHms(stamp)

    // 시간 gap 체크(아주 러프)
    const sec = stamp?.sec ?? null
    if (prevSec != null && sec != null) {
      const dt = sec - prevSec
      if (dt > 1) {
        out.push({ t, msg: `⚠️ [${sideLabel}] joint_states time gap ~${dt}s`, warn: true })
      }
    }
    if (sec != null) prevSec = sec

    // spike 체크
    let maxVel = 0
    let maxEff = 0
    for (const idx of idxs) {
      const vv = typeof s?.velocity?.[idx] === 'number' ? Math.abs(s.velocity[idx]) : 0
      const ee = typeof s?.effort?.[idx] === 'number' ? Math.abs(s.effort[idx]) : 0
      maxVel = Math.max(maxVel, vv)
      maxEff = Math.max(maxEff, ee)
    }
    if (maxVel > VEL_WARN)
      out.push({ t, msg: `⚠️ [${sideLabel}] velocity spike: ${maxVel.toFixed(2)} rad/s`, warn: true })
    if (maxEff > EFF_WARN) out.push({ t, msg: `❌ [${sideLabel}] effort spike: ${maxEff.toFixed(2)}`, error: true })
  }

  return out.slice(-8)
}

// 상대초(tSec) → KST HH:MM:SS 포맷
function formatKstTime(tSec, timeRange) {
  const base = timeRange?.absStartSec ?? timeRange?.startSec
  if (typeof base !== 'number' || typeof tSec !== 'number') return '-'
  const absMs = (base + tSec) * 1000

  const d = new Date(absMs)

  return d.toLocaleTimeString('ko-KR', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  })
}

/* ───────────────── main ───────────────── */

export default function ArmAnalysisTab({
  side = 'left',
  mcapSummary,
  jointGroups,
  windowSize = 120,
  currentTime = 0,
  isParsingMcap = false,
  mcapParseError = null
}) {
  const DEBUG = false

  const chartAreaRef = useRef(null)
  const [chartWidth, setChartWidth] = useState(0)

  useEffect(() => {
    const el = chartAreaRef.current
    if (!el) return

    const update = () => {
      const w = el.getBoundingClientRect?.().width ?? 0
      setChartWidth(w > 0 ? w : 0)
    }

    update()

    const ro = new ResizeObserver(() => update())
    ro.observe(el)

    return () => ro.disconnect()
  }, [])

  // samples['/joint_states'] may be:
  //  - [{tSec,msg},...]  (A안: tSec=상대초)
  //  - [obj,...]         (fallback)
  const wrapped = mcapSummary?.samples?.['/joint_states'] ?? []
  const timeRange = mcapSummary?.timeRange ?? null
  // ✅ 차트 전용 풀-타임라인 시리즈(백그라운드 다운샘플 로드). 준비되면 차트는 전체 구간을 펼쳐서 표시.
  const chartTimeline = mcapSummary?.chartTimelineSamples ?? null
  const chartTimelineLoading = !!mcapSummary?.isChartTimelineLoading
  const hasChartTimeline = Array.isArray(chartTimeline) && chartTimeline.length > 0

  // ✅ Target(명령) 오버레이용: /tracking_controller/joint 샘플(구·신 토픽 폴백)
  const ctrlWrapped = useMemo(
    () => resolveTopicSamples(mcapSummary?.samples ?? {}, TRACKING_TOPICS, TRACKING_FALLBACK),
    [mcapSummary]
  )

  // 분석 임계값(추정 기준) — 설정 UI(⚙)에서 조정된 값. 기본값은 analysisConfig.
  const armT = useAnalysisThresholds().arm

  const totalDuration = useMemo(() => {
    const tr = mcapSummary?.timeRange
    return tr && Number.isFinite(tr.startSec) && Number.isFinite(tr.endSec)
      ? Math.max(0, tr.endSec - tr.startSec)
      : undefined
  }, [mcapSummary])

  // 분석용: msg만 뽑아낸 배열 (stability/derivedEvents에 사용)
  const jointSamples = useMemo(() => wrapped.map((x) => x?.msg ?? x).filter(Boolean), [wrapped])

  // ✅ 표시용: currentTime에 해당하는 “현재 샘플”
  const currentSample = useMemo(
    () => selectSampleAtTime(wrapped, currentTime, totalDuration),
    [wrapped, currentTime, totalDuration]
  )

  useEffect(() => {
    const w = wrapped
    if (!Array.isArray(w) || w.length === 0) return
    const firstT = w[0]?.tSec
    const lastT = w[w.length - 1]?.tSec
    //console.log('[joint_states tSec range]', { len: w.length, firstT, lastT, currentTime })
  }, [wrapped, currentTime])

  useEffect(() => {
    if (!DEBUG) return
    //console.log('[ArmTab] props.currentTime changed:', currentTime)
  }, [currentTime, DEBUG])

  const names = currentSample?.name ?? []

  const idxs = useMemo(() => {
    // 핵심 팔 관절만: '<side>_joint_N' 패턴 (손가락 등 세부 관절은 End-Effector 탭에서 표시)
    const re = side === 'right' ? /^right_joint_(\d+)$/i : /^left_joint_(\d+)$/i
    const armJoints = []
    names.forEach((n, i) => {
      const m = re.exec(String(n ?? ''))
      if (m) armJoints.push({ i, n: Number(m[1]) })
    })
    if (armJoints.length) {
      armJoints.sort((a, b) => a.n - b.n)
      return armJoints.map((x) => x.i)
    }
    // 폴백: 패턴이 없으면 기존 동작(jointGroups[side] → 전체)
    if (jointGroups && Array.isArray(jointGroups[side]) && jointGroups[side].length > 0) {
      return jointGroups[side]
    }
    return getArmJointIndices(names, side)
  }, [jointGroups, names, side])

  // 차트 기본 joint: 손가락(index/middle 등)이 아니라 팔 주관절(left_joint_N) 우선 선택
  const autoJointIdx = useMemo(() => {
    const re = side === 'right' ? /^right_joint_(\d+)$/i : /^left_joint_(\d+)$/i
    let best = null
    let bestN = Infinity
    for (const idx of idxs) {
      const m = re.exec(String(names[idx] ?? ''))
      if (m) {
        const n = Number(m[1])
        if (n < bestN) {
          bestN = n
          best = idx
        }
      }
    }
    return best != null ? best : (idxs[0] ?? null)
  }, [idxs, names, side])

  // ✅ 사용자가 드롭다운으로 고른 차트 대상 joint(index). null이면 autoJointIdx 사용.
  //    데이터 재로딩으로 idxs가 바뀌어 선택값이 더 이상 유효하지 않으면 자동 선택으로 폴백.
  const [selectedJointIdx, setSelectedJointIdx] = useState(null)
  const chartJointIdx = useMemo(() => {
    if (selectedJointIdx != null && idxs.includes(selectedJointIdx)) return selectedJointIdx
    return autoJointIdx
  }, [selectedJointIdx, idxs, autoJointIdx])

  // 드롭다운 옵션: 이 팔의 joint 목록(이름)
  const jointOptions = useMemo(
    () => idxs.map((idx) => ({ name: String(names[idx] ?? `joint_${idx}`), value: String(idx) })),
    [idxs, names]
  )

  const joints = useMemo(() => {
    if (!currentSample) return []
    return idxs.map((idx, i) => {
      const full = String(names[idx] ?? `J${i + 1}`)
      const posRad = currentSample?.position?.[idx]
      const vel = currentSample?.velocity?.[idx]
      const eff = currentSample?.effort?.[idx]
      const posDeg = rad2deg(posRad)

      // 경고 기준(추정): vel/eff 값 기반. 임계값은 설정 UI(⚙)에서 조정.
      const warn =
        (typeof vel === 'number' && Math.abs(vel) > armT.jointVelWarn) ||
        (typeof eff === 'number' && Math.abs(eff) > armT.jointEffWarn)
      const error =
        (typeof vel === 'number' && Math.abs(vel) > armT.jointVelError) ||
        (typeof eff === 'number' && Math.abs(eff) > armT.jointEffError)

      return {
        key: full,
        name: names[idx] ?? `J${i + 1}`,
        fullName: full,
        posDeg,
        vel,
        eff,
        warn,
        error
      }
    })
  }, [currentSample, idxs, names, armT])

  const stability = useMemo(() => {
    if (!Array.isArray(wrapped) || wrapped.length === 0) return null
    const idxNow = indexAtTime(wrapped, Number(currentTime || 0))
    if (idxNow < 0) return null

    // jointSamples는 wrapped와 동일 길이/순서라고 가정(위에서 map으로 생성)
    const start = Math.max(0, idxNow - windowSize + 1)
    const slice = jointSamples.slice(start, idxNow + 1)
    return computeStability(slice, idxs, windowSize)
  }, [wrapped, jointSamples, idxs, windowSize, currentTime])

  // ── Chart data (Position / Velocity) ─────────────────
  // 풀-타임라인 다운샘플 시리즈가 준비되면 전체 구간(5분)을 펼쳐서 표시,
  // 아직 로드 전이면 현재 ±2초 윈도우(wrapped)로 폴백 → 커서(▼)는 항상 currentTime에 위치.
  const chartData = useMemo(() => {
    const src = hasChartTimeline ? chartTimeline : wrapped
    if (!Array.isArray(src) || chartJointIdx == null) return []

    // 선택된 joint "이름"으로 매칭한다(고정 인덱스 X).
    // - currentSample과 chartTimeline은 로더 경로가 달라 퍼블리셔/배열 순서·길이가 다를 수 있음.
    //   → 각 샘플 자신의 name 배열에서 이름을 다시 찾아야 좌/우 팔 모두 정확히 그려진다.
    const jointName = names[chartJointIdx] ?? null
    const hasCtrl = Array.isArray(ctrlWrapped) && ctrlWrapped.length > 0
    let ci = 0 // joint_states와 ctrl 모두 시간순 → 1-pass 포인터로 병합
    let lastNames = null // name을 매 메시지에 안 싣는 퍼블리셔 대비: 마지막으로 본 name 유지

    const out = []
    for (let k = 0; k < src.length; k++) {
      const w = src[k]
      const t = w?.tSec
      if (typeof t !== 'number') continue

      const msg = w?.msg ?? w

      // 이 샘플의 name으로 로컬 인덱스 재계산(없으면 직전 name, 그것도 없으면 고정 인덱스로 폴백)
      const sNames = Array.isArray(msg?.name) && msg.name.length ? msg.name : lastNames
      if (Array.isArray(msg?.name) && msg.name.length) lastNames = msg.name
      let li = jointName != null && Array.isArray(sNames) ? sNames.indexOf(jointName) : -1
      if (li < 0) li = chartJointIdx

      const pos = msg?.position?.[li]
      const vel = msg?.velocity?.[li]
      const eff = msg?.effort?.[li]

      // Target(명령) 위치: tSec <= t 인 마지막 ctrl 샘플에서 joint 이름으로 매칭(rad→deg)
      let targetDeg = null
      if (hasCtrl && jointName) {
        while (ci + 1 < ctrlWrapped.length) {
          const nt = ctrlWrapped[ci + 1]?.tSec
          if (typeof nt === 'number' && nt <= t) ci++
          else break
        }
        const cmsg = ctrlWrapped[ci]?.msg ?? ctrlWrapped[ci]
        const cnames = Array.isArray(cmsg?.name) ? cmsg.name : null
        if (cnames) {
          const cIdx = cnames.indexOf(jointName)
          const tp = cIdx >= 0 ? cmsg?.target_position?.[cIdx] : null
          if (typeof tp === 'number') targetDeg = rad2deg(tp)
        }
      }

      out.push({
        t,
        posDeg: typeof pos === 'number' ? rad2deg(pos) : null,
        targetDeg,
        vel: typeof vel === 'number' ? vel : null,
        eff: typeof eff === 'number' ? eff : null
      })
    }
    return out
  }, [hasChartTimeline, chartTimeline, wrapped, chartJointIdx, names, ctrlWrapped])

  // 시리즈가 실제로 존재하는지(없으면 라인/차트 대신 안내)
  const hasPos = useMemo(() => chartData.some((d) => d.posDeg != null), [chartData])
  const hasVel = useMemo(() => chartData.some((d) => d.vel != null), [chartData])
  const hasTarget = useMemo(() => chartData.some((d) => d.targetDeg != null), [chartData])
  const hasEffort = useMemo(() => chartData.some((d) => d.eff != null), [chartData])

  const sideLabel = side === 'right' ? 'RA' : 'LA'

  const derivedEvents = useMemo(() => {
    if (!Array.isArray(wrapped) || wrapped.length === 0) return []
    const idxNow = indexAtTime(wrapped, Number(currentTime || 0))
    if (idxNow < 0) return []

    const start = Math.max(0, idxNow - windowSize + 1)
    const slice = jointSamples.slice(start, idxNow + 1)
    return buildDerivedEvents(slice, idxs, sideLabel)
  }, [wrapped, jointSamples, idxs, sideLabel, windowSize, currentTime])

  const hasData = !!currentSample

  return (
    <div style={styles.root}>
      {/* ── Joint Status ── */}
      <div style={UX.card}>
        <div style={UX.sideTitle(side)}>Joint 상태 — {side === 'right' ? 'RIGHT ARM ▶' : '◀ LEFT ARM'}</div>

        {/* 로딩/에러 상태 */}
        {mcapParseError ? (
          <div style={UX.noticePill('error')}>
            ❌ MCAP parse error: {mcapParseError?.message ?? String(mcapParseError)}
          </div>
        ) : isParsingMcap ? (
          <div style={UX.noticePill('info')}>MCAP parsing...</div>
        ) : !hasData ? (
          <div style={UX.noticePill('warn')}>⚠️ /joint_states에서 {side} arm joint를 찾지 못했습니다.</div>
        ) : (
          <>
            <div style={{ ...UX.kvRow, marginBottom: 10 }}>
              <span style={UX.kvLabel}>Stamp</span>
              <span style={UX.badge({ ok: true })}>{rosStampToKstHms(currentSample?.header?.stamp)}</span>
              <span style={UX.kvSub}>frame: {currentSample?.header?.frame_id ?? '-'}</span>
            </div>

            {joints.map((j) => {
              const pct = j.posDeg != null ? Math.min(100, (Math.abs(j.posDeg) / 180) * 100) : 0
              return (
                <div key={j.key} style={UX.gaugeRow}>
                  <div style={UX.gaugeLabel}>
                    <span title={j.fullName}>
                      {j.error ? '🔴' : j.warn ? '🟡' : '🟢'} {j.name}
                    </span>
                    <span>
                      {j.posDeg != null ? `${j.posDeg.toFixed(1)}°` : '-'} ·
                      {typeof j.vel === 'number' ? ` v ${j.vel.toFixed(2)}` : ' v -'} ·
                      {typeof j.eff === 'number' ? ` e ${j.eff.toFixed(2)}` : ' e -'}
                    </span>
                  </div>

                  <div style={UX.gaugeBar}>
                    <div
                      style={UX.gaugeFill({
                        pct,
                        warn: j.warn,
                        error: j.error,
                        side
                      })}
                    />
                  </div>
                </div>
              )
            })}
          </>
        )}

        <div style={{ marginTop: 8, fontSize: 11, color: theme.colors.textMuted }}>
          * 주요 팔 관절(<code>{side}_joint_N</code>)만 표시합니다. 손가락 관절은 End-Effector 탭에서 확인하세요.
          <br />* 🟡/🔴 표시는 vel/effort <b>추정 임계값</b> 기반이며 실측 고장 판정이 아닙니다.
        </div>
      </div>

      {/* ── 관절 추이 차트 (전체 구간) ── */}
      <div style={UX.card}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 8 }}>
          <div style={{ ...UX.sideTitle(side), marginBottom: 0 }}>관절 추이 (Position / Velocity / Effort)</div>
          <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ fontSize: 11, color: theme.colors.textMuted }}>Joint</span>
            <Dropdown
              size="sm"
              title="Joint 선택"
              value={chartJointIdx != null ? String(chartJointIdx) : ''}
              options={jointOptions}
              onChange={(v) => setSelectedJointIdx(Number(v))}
            />
          </div>
        </div>
        <div ref={chartAreaRef} style={{ width: '100%', minWidth: 0 }}>
          {/* 전체 구간 차트 로딩 중에는 ±2초 윈도우를 잠깐 보여줬다 바꾸지 않고 로딩 표시 → 모양 급변 방지 */}
          {chartTimelineLoading && !hasChartTimeline ? (
            <div style={UX.noticePill('info')}>전체 구간 차트 불러오는 중…</div>
          ) : chartData.length === 0 ? (
            <div style={UX.noticePill('warn')}>차트에 표시할 joint 데이터가 없습니다.</div>
          ) : chartWidth <= 0 ? (
            <div style={UX.noticePill('info')}>차트 영역 계산 중...</div>
          ) : (
            <>
              {/* ── Position Chart ── */}

              <div style={{ width: '100%', height: 160, minWidth: 0, minHeight: 160 }}>
                {hasPos ? (
                  <ResponsiveContainer width={chartWidth} height={160}>
                    <LineChart data={chartData}>
                      <XAxis
                        dataKey="t"
                        type="number"
                        domain={['dataMin', 'dataMax']}
                        tickFormatter={(v) => formatKstTime(v, timeRange)}
                        tick={{ fontSize: 11 }}
                      />
                      <YAxis tick={{ fontSize: 11 }} label={{ value: 'deg', angle: -90, position: 'insideLeft' }} />
                      <Tooltip />
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
                        dataKey="posDeg"
                        stroke={theme.colors.statusOk}
                        dot={false}
                        isAnimationActive={false}
                      />
                      {hasTarget && (
                        <Line
                          type="monotone"
                          dataKey="targetDeg"
                          stroke={theme.colors.accent ?? '#7B68EE'}
                          strokeWidth={1.5}
                          strokeDasharray="5 4"
                          dot={false}
                          isAnimationActive={false}
                          connectNulls
                        />
                      )}
                    </LineChart>
                  </ResponsiveContainer>
                ) : (
                  <div style={UX.noticePill('warn')}>position 데이터가 없습니다.</div>
                )}
              </div>

              {/* Position 범례: Actual(실측) vs Target(명령) */}
              <div
                style={{
                  display: 'flex',
                  gap: 14,
                  alignItems: 'center',
                  marginTop: 4,
                  fontSize: 11,
                  color: theme.colors.textMuted
                }}
              >
                <span>
                  <span
                    style={{
                      display: 'inline-block',
                      width: 12,
                      height: 2,
                      background: theme.colors.statusOk,
                      verticalAlign: 'middle',
                      marginRight: 4
                    }}
                  />
                  Actual (실측 위치)
                </span>
                {hasTarget ? (
                  <span>
                    <span
                      style={{
                        display: 'inline-block',
                        width: 12,
                        height: 0,
                        borderTop: `2px dashed ${theme.colors.accent ?? '#7B68EE'}`,
                        verticalAlign: 'middle',
                        marginRight: 4
                      }}
                    />
                    Target (명령 위치)
                  </span>
                ) : (
                  <span>Target 없음 (/tracking_controller/joint 미수신)</span>
                )}
              </div>

              {/* ── Velocity Chart ── */}
              <div style={{ width: '100%', height: 160, minWidth: 0, minHeight: 160, marginTop: 12 }}>
                {hasVel ? (
                  <ResponsiveContainer width={chartWidth} height={160}>
                    <LineChart data={chartData}>
                      <XAxis
                        dataKey="t"
                        type="number"
                        domain={['dataMin', 'dataMax']}
                        tickFormatter={(v) => formatKstTime(v, timeRange)}
                        tick={{ fontSize: 11 }}
                      />
                      <YAxis tick={{ fontSize: 11 }} label={{ value: 'rad/s', angle: -90, position: 'insideLeft' }} />
                      <Tooltip />
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
                        dataKey="vel"
                        stroke={theme.colors.statusWarn}
                        dot={false}
                        isAnimationActive={false}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                ) : (
                  <div style={UX.noticePill('info')}>velocity 데이터가 없습니다.</div>
                )}
              </div>

              {/* ── Effort(토크) Chart ── */}
              {/* 힘이 갑자기 튀는 구간 = 충돌/과부하 의심 지점 */}
              <div style={{ width: '100%', height: 160, minWidth: 0, minHeight: 160, marginTop: 12 }}>
                {hasEffort ? (
                  <ResponsiveContainer width={chartWidth} height={160}>
                    <LineChart data={chartData}>
                      <XAxis
                        dataKey="t"
                        type="number"
                        domain={['dataMin', 'dataMax']}
                        tickFormatter={(v) => formatKstTime(v, timeRange)}
                        tick={{ fontSize: 11 }}
                      />
                      <YAxis tick={{ fontSize: 11 }} label={{ value: 'effort', angle: -90, position: 'insideLeft' }} />
                      <Tooltip />
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
                        dataKey="eff"
                        stroke={theme.colors.statusError ?? '#EF4444'}
                        dot={false}
                        isAnimationActive={false}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                ) : (
                  <div style={UX.noticePill('info')}>effort(토크) 데이터가 없습니다.</div>
                )}
              </div>

              <div style={{ marginTop: 6, fontSize: 11, color: theme.colors.textMuted }}>
                joint: {names[chartJointIdx]} · samples: {chartData.length}
                {' · '}
                <span style={{ color: theme.colors.statusError }}>effort 급변 구간은 충돌/과부하를 의심하세요.</span>
              </div>
            </>
          )}
        </div>
      </div>

      {/* ── Stability Analysis ── */}
      <div style={UX.card}>
        <div style={UX.sideTitle(side)}>안정성 분석 (joint_states 기반)</div>

        {!stability ? (
          <div style={UX.noticePill('warn')}>⚠️ 안정성 분석을 위해 /joint_states 샘플이 더 필요합니다.</div>
        ) : (
          <>
            <div style={UX.gaugeRow}>
              <div style={UX.gaugeLabel}>
                <span>Smoothness</span>
                <span
                  style={{
                    color:
                      stability.smoothPct != null && stability.smoothPct < armT.smoothnessWarnPct
                        ? theme.colors.statusWarn
                        : theme.colors.statusOk
                  }}
                >
                  {stability.smoothPct?.toFixed?.(0) ?? '-'}% · velRMS {stability.velRms?.toFixed?.(2) ?? '-'}
                </span>
              </div>
              <div style={UX.gaugeBar}>
                <div
                  style={UX.gaugeFill({
                    pct: stability.smoothPct ?? 0,
                    warn: stability.smoothPct != null && stability.smoothPct < armT.smoothnessWarnPct,
                    side
                  })}
                />
              </div>
            </div>

            <div style={UX.kvRow}>
              <span style={UX.kvLabel}>vel peak</span>
              <span style={UX.badge({ ok: stability.velPeak < armT.velPeakWarn, warn: stability.velPeak >= armT.velPeakWarn })}>
                {stability.velPeak?.toFixed?.(2) ?? '-'}
              </span>
              <span style={UX.kvLabel}>eff RMS</span>
              <span style={UX.badge({ ok: true })}>{stability.effRms?.toFixed?.(2) ?? '-'}</span>
            </div>

            <div style={{ marginTop: 8, fontSize: 11, color: theme.colors.textMuted }}>
              * Smoothness는 velRMS 기반 <b>추정 지표</b>입니다(실측 안정성/진동 측정 아님).
            </div>
          </>
        )}
      </div>

      {/* ── Derived Event History ── */}
      <div style={UX.card}>
        <div style={UX.sideTitle(side)}>이벤트/경고 (자동 생성)</div>

        <div style={{ ...UX.colTight, gap: 4 }}>
          {derivedEvents.length === 0 ? (
            <div style={UX.noticePill('info')}>표시할 이벤트가 없습니다.</div>
          ) : (
            derivedEvents.map((c, i) => (
              <div key={i} style={UX.cmdItem({ warn: c.warn, error: c.error })}>
                <span style={{ color: theme.colors.textMuted }}>[{c.t}]</span> {c.msg}
              </div>
            ))
          )}
        </div>

        <div style={{ marginTop: 8, color: theme.colors.textMuted, fontSize: 11 }}>
          * /rosout, command topic이 없어서 joint_states로부터 파생된 경고만 표시합니다.
        </div>
      </div>
    </div>
  )
}

const styles = {
  root: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: 10,

    // ✅ 핵심: row를 정의하지 않는다
    gridAutoRows: 'auto',

    // ✅ 스크롤은 부모가 담당
    height: 'auto',
    minHeight: 'auto',
    overflow: 'visible'
  }
}
