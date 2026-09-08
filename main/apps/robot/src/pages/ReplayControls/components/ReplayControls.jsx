import React, { useMemo, useRef, useEffect, useCallback, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { theme, formatTime } from '../styles'
import { tSecToKstHms } from '@/utils/dateUtils'

function ReplayControls({
  totalDuration = 600,
  issues = [],
  issueNavPoints = null, // 이전/다음 이슈 이동용 개별 발생 전수. 없으면 issues(클러스터)로 폴백.
  issueCounts = null, // { err, warn } — 실제 총계(클러스터/병합과 무관). 없으면 issues로 폴백.
  onIssueSelect, // (tSec)=>void — 밴드 클릭 시 로그 패널 포커스 연동

  // ✅ controlled props
  currentTime = 0,
  isPlaying = false,
  playbackRate = 1.0,
  viewMode, // ✅ 'landing' | 'result
  // ✅ callbacks (부모가 상태를 갖고 업데이트)
  onSeek, // (t:number)=>void — 사용자 명시적 점프(드래그/이슈 이동/리셋). 부모가 seek 신호로 취급.
  onPlayTick, // (t:number)=>void — 재생 타이머 전진 전용(seek 신호 아님). 없으면 onSeek으로 폴백.
  onTogglePlay, // ()=>void
  onStop, // ()=>void
  onChangeRate, // (r:number)=>void
  timeRange = null // { absStartSec } — 절대 KST 시각 표기용
}) {
  const { t } = useTranslation('robot')
  // 절대 KST 시계. timeRange(absStartSec) 있으면 절대시각, 없으면 상대(mm:ss) 폴백.
  const fmtClock = (sec) => {
    const abs = tSecToKstHms(sec, timeRange)
    return abs === '--:--:--' ? formatTime(sec) : abs
  }
  const timerRef = useRef(null)
  const trackRef = useRef(null)
  const draggingRef = useRef(false)
  const accumStartRef = useRef(0)
  const resumeAfterDragRef = useRef(false) // 드래그 시작 시 재생 중이었는지 → 드롭 후 재개용
  const [barMode, setBarMode] = useState('point') // 'point' | 'accumulate'

  // ── 재생 전진용 내부 클록 ─────────────────────────────
  // 이 컴포넌트는 하단 React.memo 임계값 비교로 sub-tick의 currentTime 변화 시 렌더를 스킵한다.
  // 타이머가 currentTime prop을 직접 deps로 두면, 렌더가 스킵되는 구간에서 effect가 재실행되지
  // 않아 재생이 멈춘다. 따라서 ref로 시간을 자체 누적해 memo와 독립적으로 전진시킨다.
  // - 일시정지 중: prop(seek 결과)을 그대로 추종
  // - 재생 중: 타이머/doSeek가 ref를 소유(부모 state 지연에 의한 롤백 방지)
  const currentTimeRef = useRef(currentTime)
  if (!isPlaying) currentTimeRef.current = currentTime

  // 내부 seek: ref를 즉시 동기화해 렌더 스킵 여부와 무관하게 타이머가 최신 위치를 잇게 함
  const doSeek = useCallback(
    (t) => {
      currentTimeRef.current = t
      onSeek?.(t)
    },
    [onSeek]
  )

  /* ───────────────── viewMode 기반 리셋 ───────────────── */
  useEffect(() => {
    if (viewMode !== 'landing') return

    // 완전 초기 상태로
    onStop?.()
    doSeek(0)
    draggingRef.current = false
    accumStartRef.current = 0
    setBarMode('point')
  }, [viewMode, onStop, doSeek])

  /* ───────────────── 재생 로직 (부모 시간 갱신) ───────────────── */
  useEffect(() => {
    if (!isPlaying) return

    timerRef.current = setInterval(() => {
      const next = Number(currentTimeRef.current || 0) + 0.1 * Number(playbackRate || 1.0)
      const clamped = next >= totalDuration ? totalDuration : next
      currentTimeRef.current = clamped
      // ✅ 재생 전진은 onPlayTick으로 통보(= seek 신호 아님).
      //    이 통로를 onSeek과 분리해야 로더가 "점프"와 "재생 중 뒤처짐"을 구분할 수 있다.
      //    onPlayTick 미전달(구 호출부)이면 기존 동작 그대로 onSeek 폴백.
      const advance = typeof onPlayTick === 'function' ? onPlayTick : onSeek
      advance?.(clamped)
    }, 100)

    return () => clearInterval(timerRef.current)
  }, [isPlaying, playbackRate, totalDuration, onPlayTick, onSeek])

  // ▶ 재생 시작 시: 현재 위치부터 누적 시작
  useEffect(() => {
    if (isPlaying) {
      if (barMode === 'point') {
        accumStartRef.current = Number(currentTime || 0)
      }

      setBarMode('accumulate')
    }
  }, [isPlaying]) // intentionally only playback stat

  const pct = totalDuration > 0 ? (Number(currentTime || 0) / totalDuration) * 100 : 0
  const accumStartPct = totalDuration > 0 ? (Number(accumStartRef.current || 0) / totalDuration) * 100 : 0

  const progressStyle = useMemo(() => {
    if (barMode === 'accumulate') {
      const left = Math.max(0, Math.min(100, accumStartPct))
      const width = Math.max(0, Math.min(100 - left, pct - left))
      return {
        ...P.timelineProgress,
        left: `${left}%`,
        width: `${width}%`
      }
    }

    // seek / paused 상태: playhead 노브로 표시
    // - 흰 테두리 + 높은 z-index로 이슈 점 위에 올라가도 명확히 구분되게 함
    return {
      ...P.playhead,
      left: `${Math.max(0, Math.min(100, pct))}%`
    }
  }, [barMode, pct, accumStartPct])

  /* ───────────────── 이슈 카운트 ───────────────── */
  // 실제 총계(issueCounts)가 있으면 그대로 사용. 마커는 클러스터되지만 카운트는 전수치를 반영.
  const { err, warn } = useMemo(() => {
    if (issueCounts && (Number.isFinite(issueCounts.err) || Number.isFinite(issueCounts.warn))) {
      return { err: Number(issueCounts.err) || 0, warn: Number(issueCounts.warn) || 0 }
    }
    let e = 0
    let w = 0
    for (const it of issues) {
      if (it.level === 'ERROR') e++
      else if (it.level === 'WARN') w++
    }
    return { err: e, warn: w }
  }, [issues, issueCounts])

  /* ───────────────── 타임라인 드래그 ───────────────── */
  const calcTime = useCallback(
    (clientX) => {
      const rect = trackRef.current?.getBoundingClientRect?.()
      if (!rect || rect.width <= 0) return 0
      const x = Math.min(Math.max(clientX - rect.left, 0), rect.width)
      return (x / rect.width) * totalDuration
    },
    [totalDuration]
  )

  const onMouseMove = useCallback(
    (e) => {
      if (!draggingRef.current) return
      doSeek(calcTime(e.clientX))
    },
    [calcTime, doSeek]
  )

  const onMouseUp = useCallback(() => {
    draggingRef.current = false
    window.removeEventListener('mousemove', onMouseMove)
    window.removeEventListener('mouseup', onMouseUp)

    // ✅ 드래그 시작 시 재생 중이었으면, 드롭한 위치에서 재생 재개
    // (accumulate 기준점은 isPlaying effect가 barMode==='point'일 때 현재 위치로 재설정)
    if (resumeAfterDragRef.current) {
      resumeAfterDragRef.current = false
      onTogglePlay?.()
    }
  }, [onMouseMove, onTogglePlay])

  const onMouseDown = (e) => {
    e.preventDefault() // 드래그 중 텍스트/이슈밴드 선택 방지
    draggingRef.current = true
    setBarMode('point')

    // ✅ 재생 중 드래그: 재생 타이머와 충돌하지 않도록 잠시 정지(드롭 시 재개)
    if (isPlaying) {
      resumeAfterDragRef.current = true
      onStop?.()
    }

    const t = calcTime(e.clientX)
    accumStartRef.current = t
    doSeek(t)

    // 클릭 지점이 에러/경고 밴드 안이면 해당 시각으로 동기화(출처 탭 origin 포함), 밖이면 null(하이라이트 해제)
    if (typeof onIssueSelect === 'function') {
      const tol = totalDuration > 0 ? Math.max(0.15, totalDuration * 0.005) : 0.15
      const hit = (issues || []).find((iss) => t >= (iss.t ?? 0) - tol && t <= (iss.tEnd ?? iss.t ?? 0) + tol)
      onIssueSelect(hit ? t : null, hit?.origin)
    }

    window.addEventListener('mousemove', onMouseMove)
    window.addEventListener('mouseup', onMouseUp)
  }

  /* ───────────────── 이슈 네비게이션 ───────────────── */
  // 개별 발생(occurrence) 전수 기준으로 이동 → count만큼 단계 이동.
  // (issueNavPoints 없으면 클러스터 issues로 폴백)
  const navPoints = useMemo(() => {
    const src = Array.isArray(issueNavPoints) && issueNavPoints.length ? issueNavPoints : issues
    return [...src].sort((a, b) => (a.t ?? 0) - (b.t ?? 0))
  }, [issueNavPoints, issues])

  const EPS = 1e-3 // 동일/근접 시각 재선택 방지 (고빈도 발생 대응)

  const goPrevIssue = () => {
    const prev = [...navPoints].reverse().find((i) => i.t < currentTime - EPS)
    if (prev) {
      onStop?.()
      setBarMode('point')
      accumStartRef.current = prev.t
      doSeek(prev.t)
      onIssueSelect?.(prev.t, prev.origin) // 로그 패널 동기화(출처 탭 포함)
    }
  }

  const goNextIssue = () => {
    const next = navPoints.find((i) => i.t > currentTime + EPS)
    if (next) {
      onStop?.()
      setBarMode('point')
      accumStartRef.current = next.t
      doSeek(next.t)
      onIssueSelect?.(next.t, next.origin) // 로그 패널 동기화(출처 탭 포함)
    }
  }

  return (
    <div style={P.wrap}>
      {/* Row 1 */}
      <div style={P.row1}>
        <div style={P.ctrlGroup}>
          <button
            style={P.iconBtn}
            onClick={() => {
              setBarMode('point')
              const t = 0
              accumStartRef.current = t
              doSeek(t)
            }}
          >
            ⏮
          </button>

          <button style={{ ...P.iconBtn, ...P.playBtn }} onClick={() => onTogglePlay?.()}>
            {isPlaying ? '⏸' : '▶'}
          </button>

          <button
            style={P.iconBtn}
            onClick={() => {
              onStop?.()
              setBarMode('point')
            }}
          >
            ⏹
          </button>
        </div>

        <div style={P.speedGroup}>
          <span style={P.speedLabel}>{t('replayControls.playback.speedLabel')}</span>
          <input
            type="range"
            min={0.1}
            max={10}
            step={0.1}
            value={playbackRate}
            onChange={(e) => onChangeRate?.(Number(e.target.value))}
            style={P.speedSlider}
          />
        </div>

        <div style={P.speedValue}>{Number(playbackRate || 1).toFixed(1)}x</div>
      </div>

      {/* Row 2 */}
      <div style={P.row2}>
        <div style={P.timelineOuter}>
          <div style={P.startDot} />
          <div ref={trackRef} style={P.timelineTrack} onMouseDown={onMouseDown}>
            <div style={progressStyle} />

            {/* ERROR / WARN 구간 밴드 (지속 구간을 보여줌, 단발은 최소폭으로 점처럼 표시) */}
            {issues.map((issue, i) => {
              const startPct = totalDuration > 0 ? (issue.t / totalDuration) * 100 : 0
              const endPct = totalDuration > 0 ? ((issue.tEnd ?? issue.t) / totalDuration) * 100 : 0
              const left = Math.max(0, Math.min(100, startPct))
              const width = Math.max(0, Math.min(100 - left, endPct - startPct))
              const span = (issue.tEnd ?? issue.t) > issue.t ? `~${fmtClock(issue.tEnd)}` : ''
              return (
                <div
                  key={i}
                  style={{
                    ...P.issueBand,
                    left: `${left}%`,
                    width: `${width}%`,
                    background: issue.level === 'ERROR' ? theme.colors.statusError : theme.colors.statusWarn
                  }}
                  title={`${fmtClock(issue.t)}${span} [${issue.level}] ${issue.message}${
                    issue.count > 1 ? ` ×${issue.count}` : ''
                  }`}
                />
              )
            })}
          </div>
        </div>

        <div style={P.timeRow}>
          <span style={P.timeText}>{fmtClock(currentTime)}</span>
          <span style={P.issueCount}>
            {err > 0 && <span style={{ color: theme.colors.statusError }}>⬤ {err}err</span>}
            {warn > 0 && <span style={{ color: theme.colors.statusWarn, marginLeft: 8 }}>⬤ {warn}warn</span>}
          </span>
          <span style={P.timeText}>{fmtClock(totalDuration)}</span>
        </div>
      </div>

      {/* Row 3 */}
      <div style={P.row3}>
        <button style={P.navBtn} onClick={goPrevIssue}>
          {t('replayControls.playback.prevIssue')}
        </button>
        <button style={P.navBtn} onClick={goNextIssue}>
          {t('replayControls.playback.nextIssue')}
        </button>
      </div>
    </div>
  )
}

const P = {
  wrap: {
    width: '100%',
    background: '#fff',
    border: `1px solid ${theme.colors.border}`,
    borderRadius: 10,
    padding: '10px 12px',
    display: 'flex',
    flexDirection: 'column',
    gap: 10,
    boxSizing: 'border-box',
    flexShrink: 0, // ✅ 위/아래 패널 압력 받아도 플레이바가 찌그러지지 않게
    position: 'relative', // ✅ z-index가 의미 있게 동작하도록(필요 시)
    zIndex: 1 // ✅ 탭/뷰/로그가 이상하게 덮을 때 최소 방탄
  },
  row1: {
    display: 'flex',
    alignItems: 'center',
    gap: 10
  },
  ctrlGroup: {
    display: 'flex',
    alignItems: 'center',
    gap: 8
  },
  iconBtn: {
    width: 34,
    height: 34,
    borderRadius: '50%',
    border: `2px solid ${theme.colors.border}`,
    background: '#fff',
    color: theme.colors.text,
    cursor: 'pointer',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center'
  },
  playBtn: { fontSize: 16 },
  speedGroup: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    flex: 1
  },
  speedLabel: {
    fontSize: 13,
    color: theme.colors.textSecondary
  },
  speedSlider: { flex: 1 },
  speedValue: {
    minWidth: 44,
    textAlign: 'right'
  },
  row2: {
    display: 'flex',
    flexDirection: 'column',
    gap: 8
  },
  timelineOuter: {
    position: 'relative',
    width: '100%',
    height: 10,
    display: 'flex',
    alignItems: 'center'
  },
  startDot: {
    position: 'absolute',
    left: -1,
    width: 10,
    height: 10,
    borderRadius: '50%',
    background: theme.colors.primary
  },
  timelineTrack: {
    position: 'relative',
    width: '100%',
    height: 6,
    background: '#D1D5DB',
    borderRadius: 9999,
    cursor: 'pointer', // 드래그/시크 가능함을 시각적으로 표시
    userSelect: 'none' // 드래그 중 선택 하이라이트 방지
  },
  timelineProgress: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    background: theme.colors.primary
  },
  // ERROR/WARN 지속 구간 밴드. 단발 이슈도 보이도록 최소폭(6px) 보장.
  issueBand: {
    position: 'absolute',
    top: '50%',
    transform: 'translateY(-50%)',
    minWidth: 6,
    height: 8,
    borderRadius: 4,
    opacity: 0.9,
    zIndex: 1
  },
  // seek/paused 상태의 현재 위치 표시 노브 (이슈 점 위에 보이도록 z-index 우선)
  playhead: {
    position: 'absolute',
    top: '50%',
    transform: 'translate(-50%, -50%)',
    width: 14,
    height: 14,
    borderRadius: '50%',
    background: theme.colors.primary,
    border: '2px solid #fff',
    boxShadow: '0 0 0 1px rgba(0,0,0,0.25)',
    zIndex: 3
  },
  timeRow: {
    display: 'flex',
    justifyContent: 'space-between',
    fontSize: 12
  },
  timeText: {
    fontFamily: 'Consolas, monospace'
  },
  issueCount: {
    display: 'inline-flex',
    alignItems: 'center'
  },
  row3: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: 10
  },
  navBtn: {
    height: 34,
    borderRadius: 6,
    border: `1px solid ${theme.colors.border}`,
    background: theme.colors.surfaceAlt,
    cursor: 'pointer'
  }
}

// 맞춤 비교자: 의미 있는 변화만 렌더 (PlayerBar의 threshold memo와 동일한 취지)
// - currentTime은 재생 틱마다 미세 변동하므로 sub-tick(EPS_T) 이하 변화는 렌더 스킵.
//   (재생 전진은 타이머가 currentTimeRef로 자체 수행하므로 렌더 스킵해도 멈추지 않음)
// - 나머지 prop(부모 useMemo/useCallback으로 안정)은 참조 비교로 변화 시 렌더.
//   → logHeight 드래그/logFocus/deviceName 등 무관한 부모 리렌더로부터 플레이바를 격리.
const EPS_T = 0.04 // 초. sub-tick jitter/중복 렌더 차단(≈0.4x 배속까지 매 틱 갱신 유지)

export default React.memo(ReplayControls, (p, n) => {
  if (p.totalDuration !== n.totalDuration) return false
  if (p.isPlaying !== n.isPlaying) return false
  if (p.playbackRate !== n.playbackRate) return false
  if (p.viewMode !== n.viewMode) return false

  if (p.issues !== n.issues) return false
  if (p.issueNavPoints !== n.issueNavPoints) return false
  if (p.issueCounts !== n.issueCounts) return false
  if (p.timeRange !== n.timeRange) return false

  if (p.onSeek !== n.onSeek) return false
  if (p.onPlayTick !== n.onPlayTick) return false
  if (p.onTogglePlay !== n.onTogglePlay) return false
  if (p.onStop !== n.onStop) return false
  if (p.onChangeRate !== n.onChangeRate) return false
  if (p.onIssueSelect !== n.onIssueSelect) return false

  const t0 = Number(p.currentTime) || 0
  const t1 = Number(n.currentTime) || 0
  if (Math.abs(t0 - t1) > EPS_T) return false

  return true
})
