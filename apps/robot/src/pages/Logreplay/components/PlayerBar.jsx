import React, { useEffect, useMemo, useRef, useState } from 'react'
import { S } from '../styles'

function PlayerBar({
  canPlay,
  isPlaying,
  handlePrevFrame,
  handleTogglePlay,
  handleNextFrame,
  progressBarRef,
  handleProgressPointerDown,
  onProgressMouseEnter,
  onProgressMouseMove,
  onProgressMouseLeave,
  playRatio,
  playFillStartRatio,
  currentTimestampMs,
  durationMs,
  formattedCurrentTime,
  formattedDuration,
  msToClock,
  playbackRate = 1,
  onChangePlaybackRate,
  canStep,
  hoverVisible,
  hoverMs,
  hoverRatio,
  hoverAbsLabel
}) {
  const stepEnabled = typeof canStep === 'boolean' ? canStep : !!canPlay

  const leftTimeLabel =
    (typeof formattedCurrentTime === 'string' && formattedCurrentTime) ||
    (typeof currentTimestampMs === 'number' ? msToClock(currentTimestampMs) : '00:00.000')

  const speedOptions = useMemo(() => [0.01, 0.05, 0.2, 0.5, 1, 2, 3, 10], [])
  const [speedOpen, setSpeedOpen] = useState(false)
  const speedBtnRef = useRef(null)
  const speedMenuRef = useRef(null)
  const toggleSpeedMenu = () => setSpeedOpen((v) => !v)

  useEffect(() => {
    if (!speedOpen) return
    const onDocClick = (e) => {
      const b = speedBtnRef.current
      const m = speedMenuRef.current
      if (m && !m.contains(e.target) && b && !b.contains(e.target)) {
        setSpeedOpen(false)
      }
    }
    const onKey = (e) => {
      if (e.key === 'Escape') setSpeedOpen(false)
    }
    document.addEventListener('mousedown', onDocClick)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDocClick)
      document.removeEventListener('keydown', onKey)
    }
  }, [speedOpen])

  const handleSelectRate = (r) => {
    if (typeof onChangePlaybackRate === 'function') onChangePlaybackRate(r)
    setSpeedOpen(false)
  }

  const checkMark = (
    <span aria-hidden="true" style={S.speedMenu.checkMark}>
      ✓
    </span>
  )
  const clampedPlay = Math.max(0, Math.min(1, Number.isFinite(playRatio) ? playRatio : 0))

  // ✅ fill 시작점은 플레이어가 seek/step 시 "동기적으로" 확정한 값 사용
  //    (비동기 bufferRatio 부호에 의존하지 않으므로 seek 직후 잔상/누적이 발생하지 않음)
  const fillStart = Math.max(0, Math.min(1, Number.isFinite(playFillStartRatio) ? playFillStartRatio : 0))
  const fillWidth = Math.max(0, clampedPlay - fillStart)
  const showFill = clampedPlay > 0.001 // 초기 상태(0)에서 숨김

  const onPrevClick = (e) => {
    e.preventDefault()
    e.stopPropagation()
    if (!stepEnabled) return
    handlePrevFrame?.()
  }
  const onNextClick = (e) => {
    e.preventDefault()
    e.stopPropagation()
    if (!stepEnabled) return
    handleNextFrame?.()
  }
  const onToggleClick = (e) => {
    e.preventDefault()
    e.stopPropagation()
    if (!canPlay) return
    handleTogglePlay?.()
  }

  return (
    <div style={S.playerBarFull}>
      {/* 1) 상단: 진행바(버퍼 + 진행) */}
      <div style={S.playerTopRow}>
        <div
          ref={progressBarRef}
          style={{ ...S.progressWrapFull, position: 'relative', overflow: 'visible' }} // tooltip이 잘리지 않도록
          aria-label="재생 진행도"
          role="slider"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={Math.round(clampedPlay * 100)}
          aria-valuetext={`${Math.round(clampedPlay * 100)}%`}
          onMouseDown={handleProgressPointerDown}
          onMouseMove={onProgressMouseMove} // ★ hook 로직 사용
          onMouseEnter={onProgressMouseEnter} // ★ hook 로직 사용
          onMouseLeave={onProgressMouseLeave} // ★ hook 로직 사용
        >
          {/* on-demand HTTP Range 방식이므로 버퍼 바 없음. 진행 채움만 표시 */}
          {showFill && (
            <div
              style={{
                ...S.progressFill,
                position: 'absolute',
                left: `${fillStart * 100}%`,
                width: fillWidth > 0.003 ? `${fillWidth * 100}%` : '3px'
              }}
            />
          )}

          {hoverVisible && durationMs > 0 && (
            <div style={{ ...S.speedMenu.tooltipWrapStyle, zIndex: 2 }} aria-hidden="true">
              <div
                style={{
                  ...S.speedMenu.tooltipStyle,
                  left: `${Math.max(0, Math.min(100, (hoverRatio || 0) * 100))}%`,
                  transform: 'translateX(-50%)'
                }}
              >
                {/* ★ base가 있으면 절대시간(KST), 없으면 상대 ms 포맷 */}
                {hoverAbsLabel && typeof hoverAbsLabel === 'string'
                  ? hoverAbsLabel
                  : typeof msToClock === 'function'
                    ? msToClock(hoverMs)
                    : `${hoverMs}ms`}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 2) 하단: 좌-중앙-우 */}
      <div style={S.playerBottomRow}>
        <div style={S.playerLeftBox} title={leftTimeLabel}>
          {leftTimeLabel}
        </div>

        <div style={S.playerCenterControls}>
          <button
            type="button"
            style={{ ...S.playerButton, ...(stepEnabled ? {} : S.disabledButton) }}
            onClick={onPrevClick}
            title="이전"
            disabled={!stepEnabled}
            aria-disabled={!stepEnabled}
          >
            &lt;
          </button>
          <button
            type="button"
            style={{ ...S.playerButton, ...(canPlay ? {} : S.disabledButton) }}
            onClick={onToggleClick}
            title={isPlaying ? '일시정지' : '재생'}
            disabled={!canPlay}
            aria-disabled={!canPlay}
          >
            {isPlaying ? '||' : '▶'}
          </button>
          <button
            type="button"
            style={{ ...S.playerButton, ...(stepEnabled ? {} : S.disabledButton) }}
            onClick={onNextClick}
            title="다음"
            disabled={!stepEnabled}
            aria-disabled={!stepEnabled}
          >
            &gt;
          </button>
        </div>

        <div style={S.playerRightBox}>
          <button
            ref={speedBtnRef}
            type="button"
            style={S.speedMenu.button}
            onClick={toggleSpeedMenu}
            aria-haspopup="listbox"
            aria-expanded={speedOpen}
            title="재생 속도"
          >
            <span style={{ opacity: canPlay ? 1 : 0.6 }}>{`${playbackRate}×`}</span>
            <span style={{ ...S.speedMenu.caret, ...(speedOpen ? S.speedMenu.caretOpen : null) }} />
          </button>

          {speedOpen && (
            <div
              ref={speedMenuRef}
              role="listbox"
              aria-label="재생 속도 선택"
              style={S.speedMenu.dropdown}
              tabIndex={-1}
            >
              {speedOptions.map((r) => {
                const selected = Number(r) === Number(playbackRate)
                return (
                  <button
                    key={r}
                    role="option"
                    aria-selected={selected}
                    style={{ ...S.speedMenu.item, ...(selected ? S.speedMenu.itemSelected : null) }}
                    onClick={() => handleSelectRate(r)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault()
                        handleSelectRate(r)
                      }
                    }}
                  >
                    <span>{`${r}×`}</span>
                    {selected ? checkMark : <span style={S.speedMenu.emptyRight} />}
                  </button>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// 맞춤 비교자: 의미 있는 변화만 렌더
const EPS_R = 0.002 // 진행: 0.2% 이상
const EPS_B = 0.01 // 버퍼: 1% 이상
const EPS_T = 120 // 시간(ms): 120ms 이상

export default React.memo(PlayerBar, (p, n) => {
  if (p.canPlay !== n.canPlay) return false
  if (p.isPlaying !== n.isPlaying) return false
  if ((p.canStep ?? p.canPlay) !== (n.canStep ?? n.canPlay)) return false
  if (p.playbackRate !== n.playbackRate) return false

  if (p.handlePrevFrame !== n.handlePrevFrame) return false
  if (p.handleTogglePlay !== n.handleTogglePlay) return false
  if (p.handleNextFrame !== n.handleNextFrame) return false
  if (p.handleProgressPointerDown !== n.handleProgressPointerDown) return false
  if (p.onChangePlaybackRate !== n.onChangePlaybackRate) return false
  if (p.msToClock !== n.msToClock) return false

  // ▼ Hover tooltip 이벤트 핸들러 및 표시 값이 바뀌면 반드시 리렌더
  if (p.onProgressMouseEnter !== n.onProgressMouseEnter) return false
  if (p.onProgressMouseMove !== n.onProgressMouseMove) return false
  if (p.onProgressMouseLeave !== n.onProgressMouseLeave) return false
  if (p.hoverVisible !== n.hoverVisible) return false
  if (p.hoverMs !== n.hoverMs) return false
  if (p.hoverRatio !== n.hoverRatio) return false
  // 툴팁 절대시간 라벨(hover 중에만 변함) — 누락 시 stale 라벨
  if ((p.hoverAbsLabel || '') !== (n.hoverAbsLabel || '')) return false

  // durationMs: 툴팁 게이팅(durationMs > 0)/라벨에 사용. 로드당 1회(0→N) 정도만 바뀌므로
  // 엄격 비교해도 재생 중 throttle에 영향 없음.
  if ((Number(p.durationMs) || 0) !== (Number(n.durationMs) || 0)) return false

  const r0 = Number(p.playRatio) || 0,
    r1 = Number(n.playRatio) || 0
  if (Math.abs(r0 - r1) > EPS_R) return false

  // fill 시작점 변화(seek/step/재시작)도 반드시 리렌더
  const f0 = Number(p.playFillStartRatio) || 0,
    f1 = Number(n.playFillStartRatio) || 0
  if (Math.abs(f0 - f1) > EPS_B) return false

  const t0 = Number(p.currentTimestampMs) || 0
  const t1 = Number(n.currentTimestampMs) || 0
  if (Math.abs(t0 - t1) > EPS_T) return false

  return true
})
