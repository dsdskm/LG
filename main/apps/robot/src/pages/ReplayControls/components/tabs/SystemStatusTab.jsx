// components/tabs/SystemStatusTab.jsx
import React, { useMemo } from 'react'
import { UX, theme } from '../../styles'
import { rosStampToKstHms, tSecToKstHms } from '@/utils/dateUtils'
import { selectSampleAtTime } from '../../utils/sampleSelect'
import {
  DIAGNOSTIC_TOPICS,
  ACTUATOR_TOPICS,
  DIAGNOSTIC_FALLBACK,
  ACTUATOR_FALLBACK,
  resolveTopicKey
} from '../../utils/topics'

/* ───────────────── helpers ───────────────── */

// diagnostic 메시지( DiagnosticArray or DiagnosticStatus )를 최대한 안전하게 펼치기
function normalizeDiagnostics(msg) {
  if (!msg) return []
  // DiagnosticArray 형태
  if (Array.isArray(msg.status)) return msg.status.filter(Boolean)
  // DiagnosticStatus 형태
  if (typeof msg.level === 'number' || msg.name || msg.message) return [msg]
  return []
}

function levelLabel(level) {
  // ROS diagnostic: 0 OK, 1 WARN, 2 ERROR, 3 STALE
  if (level === 0) return 'OK'
  if (level === 1) return 'WARN'
  if (level === 2) return 'ERROR'
  if (level === 3) return 'STALE'
  return 'UNKNOWN'
}

function levelKind(level) {
  if (level === 2) return 'error'
  if (level === 1 || level === 3) return 'warn'
  return 'ok'
}

// 필드가 배열(name 등) 또는 인덱스 키 객체({0:..,1:..}, 일부 actuator 스키마)로 올 수 있어 모두 처리.
function fieldCount(container) {
  if (Array.isArray(container)) return container.length
  if (container && typeof container === 'object') return Object.keys(container).length
  return 0
}
function fieldAt(container, i) {
  if (container == null) return undefined
  if (Array.isArray(container)) return container[i]
  if (typeof container === 'object') return container[i] ?? container[String(i)]
  return undefined
}

function summarizeActuators(act) {
  if (!act) return null
  const names = Array.isArray(act.name) ? act.name : []
  const servo = act.servo_on
  const err = act.error_code
  const mode = act.drv_mode

  const n = names.length || Math.max(fieldCount(servo), fieldCount(err), fieldCount(mode))
  if (!n) return null

  let servoOnCount = 0
  let errCount = 0
  const modeCounts = new Map()

  for (let i = 0; i < n; i++) {
    const s = fieldAt(servo, i) // number(0/1) 또는 boolean 모두 허용
    const e = fieldAt(err, i)
    const m = fieldAt(mode, i)

    if (s === true || (typeof s === 'number' && s !== 0)) servoOnCount++
    if (typeof e === 'number' ? e !== 0 : !!e) errCount++

    if (m != null) modeCounts.set(m, (modeCounts.get(m) || 0) + 1)
  }

  const modes = Array.from(modeCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .map(([k, v]) => `${k}(${v})`)
    .join(', ')

  return {
    total: n,
    servoOnCount,
    errCount,
    modes: modes || '-',
    stamp: act?.header?.stamp ? rosStampToKstHms(act.header.stamp) : '-'
  }
}

/* ───────────────── main ───────────────── */

export default function SystemStatusTab({
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

  // 토픽 이름은 환경/펌웨어 버전에 따라 다를 수 있어 후보+폴백으로 해석 (구·신 이름 모두 지원)
  const diagKey = resolveTopicKey(samples, DIAGNOSTIC_TOPICS, DIAGNOSTIC_FALLBACK)
  const actKey = resolveTopicKey(samples, ACTUATOR_TOPICS, ACTUATOR_FALLBACK)
  const diagWrapped = (diagKey && samples[diagKey]) || []
  const actWrapped = (actKey && samples[actKey]) || []

  const diagMsg = useMemo(
    () => selectSampleAtTime(diagWrapped, currentTime, duration),
    [diagWrapped, currentTime, duration]
  )
  const actMsg = useMemo(
    () => selectSampleAtTime(actWrapped, currentTime, duration),
    [actWrapped, currentTime, duration]
  )

  const diagList = useMemo(() => normalizeDiagnostics(diagMsg), [diagMsg])

  const diagSummary = useMemo(() => {
    const counts = { ok: 0, warn: 0, error: 0, stale: 0 }
    const hot = []
    for (const st of diagList) {
      const lv = st?.level
      if (lv === 0) counts.ok++
      else if (lv === 1) counts.warn++
      else if (lv === 2) counts.error++
      else if (lv === 3) counts.stale++
      // warn/error/stale만 리스트업
      if (lv === 1 || lv === 2 || lv === 3) {
        hot.push({
          level: lv,
          name: st?.name || '(no name)',
          message: st?.message || '',
          hardware_id: st?.hardware_id || ''
        })
      }
    }
    return {
      counts,
      hot: hot.slice(0, 10),
      // DiagnosticStatus는 header가 없어 stamp가 비므로, 현재 재생 시점 절대 KST로 폴백
      stamp: diagMsg?.header?.stamp ? rosStampToKstHms(diagMsg.header.stamp) : tSecToKstHms(currentTime, timeRange)
    }
  }, [diagList, diagMsg, currentTime, timeRange])

  const actSummary = useMemo(() => summarizeActuators(actMsg), [actMsg])

  // ── gating ──────────────────────────────
  if (mcapParseError)
    return (
      <div style={UX.noticePill('error')}>❌ MCAP parse error: {mcapParseError?.message ?? String(mcapParseError)}</div>
    )
  if (isParsingMcap) return <div style={UX.noticePill('info')}>MCAP parsing...</div>

  const hasDiag = Array.isArray(diagWrapped) && diagWrapped.length > 0
  const hasAct = Array.isArray(actWrapped) && actWrapped.length > 0

  return (
    <div style={UX.grid2}>
      {/* ── Diagnostics ── */}
      <div style={UX.card}>
        <div style={UX.sectionTitle}>진단 상태 ({diagKey || '/diagnostic'})</div>

        {!hasDiag ? (
          <div style={UX.noticePill('warn')}>⚠️ diagnostic 토픽 샘플이 없습니다.</div>
        ) : (
          <>
            <div style={UX.kvRow}>
              <span style={UX.kvLabel}>Time</span>
              <span style={UX.badge({ ok: true })}>{diagSummary.stamp}</span>
              <span style={UX.kvSub}>t={Number(currentTime || 0).toFixed(2)}s</span>
            </div>

            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 8 }}>
              <span style={UX.badge({ ok: true })}>OK {diagSummary.counts.ok}</span>
              <span style={UX.badge({ warn: diagSummary.counts.warn > 0 })}>WARN {diagSummary.counts.warn}</span>
              <span style={UX.badge({ error: diagSummary.counts.error > 0 })}>ERROR {diagSummary.counts.error}</span>
              <span style={UX.badge({ warn: diagSummary.counts.stale > 0 })}>STALE {diagSummary.counts.stale}</span>
            </div>

            <div style={{ marginTop: 10, display: 'flex', flexDirection: 'column', gap: 6 }}>
              {diagSummary.hot.length === 0 ? (
                <div style={{ fontSize: 12, color: theme.colors.textMuted }}>WARN/ERROR 항목이 없습니다.</div>
              ) : (
                diagSummary.hot.map((it, i) => (
                  <div
                    key={i}
                    style={UX.cmdItem({ warn: it.level === 1 || it.level === 3, error: it.level === 2 })}
                    title={it.hardware_id ? `hw: ${it.hardware_id}` : ''}
                  >
                    <span style={{ color: theme.colors.textMuted }}>[{levelLabel(it.level)}]</span> {it.name}
                    {it.message ? ` — ${it.message}` : ''}
                  </div>
                ))
              )}
            </div>
          </>
        )}
      </div>

      {/* ── Actuator States ── */}
      <div style={UX.card}>
        <div style={UX.sectionTitle}>구동기 상태 ({actKey || '/actuator_states'})</div>

        {!hasAct ? (
          <div style={UX.noticePill('warn')}>⚠️ actuator_states 토픽 샘플이 없습니다.</div>
        ) : !actSummary ? (
          <div style={UX.noticePill('warn')}>⚠️ actuator_states 메시지를 해석할 수 없습니다.</div>
        ) : (
          <>
            <div style={UX.kvRow}>
              <span style={UX.kvLabel}>Time</span>
              <span style={UX.badge({ ok: true })}>{actSummary.stamp}</span>
              <span style={UX.kvSub}>total {actSummary.total}</span>
            </div>

            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 8 }}>
              <span style={UX.badge({ ok: actSummary.servoOnCount === actSummary.total })}>
                ServoOn {actSummary.servoOnCount}/{actSummary.total}
              </span>
              <span style={UX.badge({ error: actSummary.errCount > 0, ok: actSummary.errCount === 0 })}>
                Error {actSummary.errCount}
              </span>
              <span style={UX.badge({ ok: true })}>drv_mode {actSummary.modes}</span>
            </div>

            <div style={{ marginTop: 10, fontSize: 11, color: theme.colors.textMuted }}>
              * status_word/drive_mode/error_code는 하드웨어 상태 기반(팩트)이며, joint_states 기반 휴리스틱보다 우선
              신뢰할 수 있습니다.
            </div>
          </>
        )}
      </div>
    </div>
  )
}
