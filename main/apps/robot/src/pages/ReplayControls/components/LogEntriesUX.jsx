// /components/LogEntriesUX.jsx
import React, { useMemo, useState, useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { UX, theme } from '../styles'
import { tSecToKstHms } from '@/utils/dateUtils'

function pad2(n) {
  return String(n).padStart(2, '0')
}

function secToClock(sec) {
  if (!Number.isFinite(sec)) return '--:--'
  const s = Math.max(0, Math.floor(sec))
  const mm = Math.floor(s / 60)
  const ss = s % 60
  return `${pad2(mm)}:${pad2(ss)}`
}

function levelToText(level) {
  // DiagnosticStatus.level: 0=OK, 1=WARN, 2=ERROR, 3=STALE
  if (level === 2) return 'ERROR'
  if (level === 1) return 'WARN'
  if (level === 0) return 'OK'
  if (level === 3) return 'STALE'
  return 'INFO'
}

function levelColor(lv) {
  const x = lv
  return x === 'ERROR'
    ? theme.colors.statusError
    : x === 'WARN'
      ? theme.colors.statusWarn
      : x === 'OK'
        ? theme.colors.statusOk || '#10B981'
        : theme.colors.primary
}

// --- local styles (Tabs 우회) ---
const tabBarStyle = {
  display: 'flex',
  alignItems: 'center',
  gap: 16,
  padding: '10px 12px 0 12px',
  borderBottom: `1px solid ${theme.colors.border}`,
  background: theme.colors.surface,
  flexShrink: 0
}

const tabBtnStyle = (active) => ({
  appearance: 'none',
  border: 'none',
  background: 'transparent',
  padding: '10px 2px',
  fontSize: 14,
  fontWeight: active ? 800 : 700,
  color: active ? theme.colors.text : theme.colors.textMuted,
  cursor: 'pointer',
  borderBottom: active ? `2px solid ${theme.colors.primary}` : '2px solid transparent'
})

// 4컬럼(없으면 fallback)
const head4Fallback = {
  ...(UX.logTableHead || {}),
  display: 'grid',
  gridTemplateColumns: '90px 80px 120px 1fr',
  gap: 10,
  padding: '8px 12px',
  borderBottom: `1px solid ${theme.colors.border}`,
  color: theme.colors.textMuted,
  fontWeight: 800,
  fontSize: 12,
  flexShrink: 0
}

const row4Fallback = {
  ...(UX.logRow || {}),
  display: 'grid',
  gridTemplateColumns: '90px 80px 120px 1fr',
  gap: 10,
  alignItems: 'start',
  padding: '8px 10px',
  borderRadius: 8,
  border: `1px solid ${theme.colors.border}`,
  background: theme.colors.surface
}

export default function LogEntriesUX({
  diagnosticEvents,
  textEntries,
  isParsingMcap,
  mcapParseError,
  onSeek,
  logFocus,
  currentTime = 0,
  timeRange = null,
  logGaps = null // [{ startSec, endSec }] — 빠른 재생으로 불러오지 못한 구간(Text 탭에 구분선으로 표시)
}) {
  const { t } = useTranslation('robot')
  // 절대 KST 시계. timeRange(absStartSec)가 있으면 절대시각, 없으면 상대 mm:ss로 폴백.
  const fmtClock = (tSec) => {
    const abs = tSecToKstHms(tSec, timeRange)
    return abs === '--:--:--' ? secToClock(tSec) : abs
  }
  const [activeTab, setActiveTab] = useState('system') // 'system' | 'text'
  const [highlightIdx, setHighlightIdx] = useState(-1)
  const rowRefs = useRef(new Map())
  const scrollBodyRef = useRef(null)
  // Text 탭 전용 ref (System 탭과 분리)
  const textRowRefs = useRef(new Map())
  const textScrollRef = useRef(null)

  const systemRows = useMemo(() => {
    const arr = diagnosticEvents || []
    return arr.map((e) => ({
      tSec: e.tSec, // ✅ 행 클릭 시 이동(seek)에 사용
      timeText: fmtClock(e.tSec),
      levelText: levelToText(e.level),
      sourceText: e.source,
      messageText: e.message
    }))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [diagnosticEvents, timeRange])

  // ✅ 플레이바 이슈 이동(logFocus) → 출처 탭(origin)으로 전환 + 가장 가까운 행 하이라이트/스크롤
  // - origin === 'text' : Text 탭으로 전환. (Text 행은 탭 활성 시에만 렌더되므로 스크롤/하이라이트는
  //   currentTime 이동에 따라 동작하는 currentTextIdx 이펙트에 위임 — 여기선 탭 전환만 처리)
  // - 그 외('system' 또는 미지정) : System 탭에서 직접 검색·하이라이트·스크롤
  useEffect(() => {
    const ts = logFocus?.tSec
    // 빈 영역 클릭 등으로 ts가 없으면 하이라이트 해제
    if (!Number.isFinite(ts)) {
      setHighlightIdx(-1)
      return
    }

    if (logFocus?.origin === 'text') {
      setActiveTab('text')
      setHighlightIdx(-1) // System 하이라이트 해제(Text는 currentTextIdx로 표시)
      return
    }

    if (!systemRows.length) return

    let bestIdx = -1
    let bestDiff = Infinity
    for (let i = 0; i < systemRows.length; i++) {
      const t = systemRows[i].tSec
      if (!Number.isFinite(t)) continue
      const diff = Math.abs(t - ts)
      if (diff < bestDiff) {
        bestDiff = diff
        bestIdx = i
      }
    }
    if (bestIdx < 0) return

    setActiveTab('system')
    setHighlightIdx(bestIdx)

    // 행은 항상 렌더되어 있으므로 DOM 노드를 캡처해 1프레임 뒤 로그 본문 내부에서 스크롤
    const bodyEl = scrollBodyRef.current
    const rowEl = rowRefs.current.get(bestIdx)
    if (bodyEl && rowEl) {
      requestAnimationFrame(() => {
        const bodyRect = bodyEl.getBoundingClientRect()
        const rowRect = rowEl.getBoundingClientRect()
        const delta = rowRect.top - bodyRect.top - (bodyEl.clientHeight - rowRect.height) / 2
        bodyEl.scrollTo({ top: Math.max(0, bodyEl.scrollTop + delta), behavior: 'smooth' })
      })
    }
    // logFocus.seq가 바뀔 때마다(동일 시각 재클릭 포함) 재실행
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [logFocus?.seq])

  const textRows = useMemo(() => {
    const arr = Array.isArray(textEntries) ? textEntries : []
    return arr.map((e) => ({
      tSec: e?.tSec,
      timeText: fmtClock(e?.tSec),
      levelText: e?.level ?? 'INFO',
      messageText: e?.message ?? ''
    }))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [textEntries, timeRange])

  // ✅ 미로드 구간(빠른 재생으로 건너뛴 범위) → 그 구간 "뒤"에 오는 첫 행 앞에 표시할 위치를 계산.
  //    조용히 비어 있으면 "그 시간엔 로그가 없었다"로 오해할 수 있어 명시적으로 알려준다.
  const gapBeforeIdx = useMemo(() => {
    const gaps = (Array.isArray(logGaps) ? logGaps : []).filter(
      (g) => Number.isFinite(g?.startSec) && Number.isFinite(g?.endSec) && g.endSec > g.startSec
    )
    if (!gaps.length) return null
    // rowIdx -> 그 행 앞에 표시할 빈 구간 목록(rowIdx === textRows.length 이면 목록 맨 끝).
    // 같은 두 로그 행 사이에 빈 구간이 여러 개 생길 수 있으므로 배열로 모은다(하나만 표시하면 실제 상태가 가려짐).
    const map = new Map()
    for (const g of gaps) {
      let idx = textRows.findIndex((r) => Number.isFinite(r?.tSec) && r.tSec >= g.endSec)
      if (idx < 0) idx = textRows.length
      const list = map.get(idx)
      if (list) list.push(g)
      else map.set(idx, [g])
    }
    for (const list of map.values()) list.sort((a, b) => a.startSec - b.startSec)
    return map
  }, [logGaps, textRows])

  const renderGapRow = (g, key) => (
    <div
      key={key}
      style={{
        padding: '4px 10px',
        fontSize: 11,
        color: theme.colors.textMuted,
        background: 'rgba(148,163,184,0.10)',
        borderTop: `1px dashed ${theme.colors.border || 'rgba(148,163,184,0.4)'}`,
        borderBottom: `1px dashed ${theme.colors.border || 'rgba(148,163,184,0.4)'}`,
        textAlign: 'center'
      }}
    >
      {t('replayControls.logEntries.skippedRange', {
        from: fmtClock(g.startSec),
        to: fmtClock(g.endSec)
      })}
    </div>
  )

  const renderGapRows = (list, keyPrefix) => (list || []).map((g, i) => renderGapRow(g, `${keyPrefix}-${i}`))

  // ✅ 플레이바 싱크: tSec <= currentTime 인 마지막(=현재 시점) 로그 인덱스 (이진탐색)
  const currentTextIdx = useMemo(() => {
    if (!Number.isFinite(currentTime) || !textRows.length) return -1
    let lo = 0
    let hi = textRows.length - 1
    let ans = -1
    while (lo <= hi) {
      const mid = (lo + hi) >> 1
      const t = textRows[mid]?.tSec
      if (Number.isFinite(t) && t <= currentTime) {
        ans = mid
        lo = mid + 1
      } else hi = mid - 1
    }
    return ans
  }, [textRows, currentTime])

  // ✅ 현재 로그가 바뀌면(=재생이 다음 로그를 지나면) 그 행을 화면 중앙으로 스크롤
  useEffect(() => {
    if (activeTab !== 'text' || currentTextIdx < 0) return
    const bodyEl = textScrollRef.current
    const rowEl = textRowRefs.current.get(currentTextIdx)
    if (!bodyEl || !rowEl) return
    requestAnimationFrame(() => {
      const bodyRect = bodyEl.getBoundingClientRect()
      const rowRect = rowEl.getBoundingClientRect()
      const delta = rowRect.top - bodyRect.top - (bodyEl.clientHeight - rowRect.height) / 2
      bodyEl.scrollTo({ top: Math.max(0, bodyEl.scrollTop + delta), behavior: 'smooth' })
    })
  }, [currentTextIdx, activeTab])

  // ✅ 핵심: 스크롤 영역 높이 강제
  const bodyScrollStyle = {
    ...(UX.logBody || {}),
    flex: '1 1 0',
    minHeight: 0,
    overflow: 'auto'
  }

  // 메시지 잘림 방지(스타일.js가 ellipsis여도 여기서 override)
  const msgStyle = {
    ...(UX.logMsg || {}),
    whiteSpace: 'normal',
    overflowWrap: 'anywhere',
    wordBreak: 'break-word',
    lineHeight: 1.35
  }

  const head3 = {
    ...(UX.logTableHead || {}),
    flexShrink: 0
  }

  return (
    <div
      style={{
        ...UX.logPanel,
        height: '100%',
        minHeight: 0,
        display: 'flex',
        flexDirection: 'column'
      }}
    >
      <div style={UX.logTopBar}>
        <div style={{ fontWeight: 800 }}>{t('replayControls.logEntries.panelTitle')}</div>
        <div style={{ marginLeft: 'auto', color: theme.colors.textMuted, fontSize: 12 }}>
          {mcapParseError
            ? 'ERROR'
            : isParsingMcap
              ? t('replayControls.logEntries.statusLoading')
              : systemRows.length
                ? t('replayControls.logEntries.statusLive')
                : t('replayControls.logEntries.statusNoData')}
        </div>
      </div>

      {/* ✅ Tabs 컴포넌트 우회: 로컬 탭 바 */}
      <div style={tabBarStyle}>
        <button style={tabBtnStyle(activeTab === 'system')} onClick={() => setActiveTab('system')}>
          {t('replayControls.logEntries.tabSystemEvent')}
        </button>
        <button style={tabBtnStyle(activeTab === 'text')} onClick={() => setActiveTab('text')}>
          {t('replayControls.logEntries.tabText')}
        </button>
      </div>

      {/* ✅ 컨텐츠 영역: 반드시 flex:1/minHeight:0 */}
      <div style={{ flex: '1 1 0', minHeight: 0, display: 'flex', flexDirection: 'column', padding: '0 8px 8px' }}>
        {activeTab === 'system' ? (
          <>
            <div style={UX.logTableHead4 || head4Fallback}>
              <div>{t('replayControls.common.time')}</div>
              <div>{t('replayControls.common.level')}</div>
              <div>{t('replayControls.common.source')}</div>
              <div>{t('replayControls.common.message')}</div>
            </div>

            <div ref={scrollBodyRef} style={bodyScrollStyle}>
              {(systemRows || []).map((r, idx) => {
                const seekable = typeof onSeek === 'function' && Number.isFinite(r.tSec)
                const highlighted = idx === highlightIdx
                return (
                  <div
                    key={`${r.timeText}-${idx}`}
                    ref={(el) => {
                      if (el) rowRefs.current.set(idx, el)
                      else rowRefs.current.delete(idx)
                    }}
                    style={{
                      ...(UX.logRow4 || row4Fallback),
                      cursor: seekable ? 'pointer' : 'default',
                      // 하이라이트는 배경색만 변경 (border 단축속성과 충돌 방지)
                      ...(highlighted ? { background: theme.colors.highlight || 'rgba(59,130,246,0.16)' } : null)
                    }}
                    // 행 클릭: 이동 + 클릭한 행 하이라이트(이전 하이라이트는 자동 해제)
                    onClick={
                      seekable
                        ? () => {
                            setHighlightIdx(idx)
                            onSeek(r.tSec)
                          }
                        : undefined
                    }
                    title={seekable ? t('replayControls.logEntries.moveTo', { time: r.timeText }) : undefined}
                  >
                    <div style={{ color: theme.colors.textSecondary, fontFamily: 'Consolas, monospace' }}>
                      {r.timeText}
                    </div>
                    <div style={{ fontWeight: 800, color: levelColor(r.levelText) }}>{r.levelText}</div>
                    <div style={{ fontWeight: 650, color: theme.colors.textPrimary }}>{r.sourceText}</div>
                    <div style={msgStyle}>{r.messageText}</div>
                  </div>
                )
              })}

              {!systemRows.length && (
                <div style={{ padding: 10, color: theme.colors.textMuted, fontSize: 12 }}>
                  {mcapParseError
                    ? t('replayControls.logEntries.parseError', {
                        message: mcapParseError?.message || String(mcapParseError)
                      })
                    : isParsingMcap
                      ? t('replayControls.logEntries.loadingMcap')
                      : t('replayControls.logEntries.noSystemLogs')}
                </div>
              )}
            </div>
          </>
        ) : (
          <>
            <div style={head3}>
              <div>{t('replayControls.common.time')}</div>
              <div>{t('replayControls.common.level')}</div>
              <div>{t('replayControls.common.message')}</div>
            </div>

            <div ref={textScrollRef} style={bodyScrollStyle}>
              {textRows.map((r, idx) => {
                const seekable = typeof onSeek === 'function' && Number.isFinite(r.tSec)
                const highlighted = idx === currentTextIdx
                const gaps = gapBeforeIdx?.get(idx)
                return (
                  <React.Fragment key={idx}>
                    {gaps ? renderGapRows(gaps, `gap-${idx}`) : null}
                    <div
                      ref={(el) => {
                        if (el) textRowRefs.current.set(idx, el)
                        else textRowRefs.current.delete(idx)
                      }}
                      style={{
                        ...UX.logRow,
                        cursor: seekable ? 'pointer' : 'default',
                        ...(highlighted ? { background: theme.colors.highlight || 'rgba(59,130,246,0.16)' } : null)
                      }}
                      onClick={seekable ? () => onSeek(r.tSec) : undefined}
                      title={seekable ? t('replayControls.logEntries.moveTo', { time: r.timeText }) : undefined}
                    >
                      <div style={{ color: theme.colors.textSecondary, fontFamily: 'Consolas, monospace' }}>
                        {r.timeText}
                      </div>
                      <div
                        style={{
                          fontWeight: 800,
                          color:
                            r.levelText === 'ERROR'
                              ? theme.colors.statusError
                              : r.levelText === 'WARN'
                                ? theme.colors.statusWarn
                                : theme.colors.primary
                        }}
                      >
                        {r.levelText}
                      </div>
                      <div style={msgStyle} title={r.messageText}>
                        {r.messageText}
                      </div>
                    </div>
                  </React.Fragment>
                )
              })}

              {/* 마지막 행 이후에 생긴 미로드 구간(아직 그 뒤 로그가 안 들어온 경우) */}
              {gapBeforeIdx?.get(textRows.length)
                ? renderGapRows(gapBeforeIdx.get(textRows.length), 'gap-tail')
                : null}

              {!textRows.length && (
                <div style={{ padding: 10, color: theme.colors.textMuted, fontSize: 12 }}>
                  {mcapParseError
                    ? t('replayControls.logEntries.parseError', {
                        message: mcapParseError?.message || String(mcapParseError)
                      })
                    : isParsingMcap
                      ? t('replayControls.logEntries.loadingMcap')
                      : t('replayControls.logEntries.noTextLogs')}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
