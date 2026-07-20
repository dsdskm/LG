import React, { memo, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { Button, Input, Checkbox } from '@repo/ui'
import { List } from 'react-window'
import { S } from '../styles'

const ROW_HEIGHT = 20
const VIRTUAL_THRESHOLD = 1800
const MAX_RENDER_LINES = 4000
const MIN_LIST_HEIGHT = 120
const MAX_MEASURE_RETRY = 8

const escapeRegExp = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
function useHighlighter(keyword) {
  return useMemo(() => {
    const raw = (keyword ?? '').trim()
    if (!raw) return (text) => text
    let rgx
    const m = raw.match(/^\/(.+)\/([a-z]*)$/i)
    if (m) {
      try {
        rgx = new RegExp(m[1], m[2])
      } catch {
        rgx = null
      }
    }
    if (!rgx) {
      try {
        rgx = new RegExp(escapeRegExp(raw), 'ig')
      } catch {
        rgx = null
      }
    }
    if (!rgx) return (text) => text
    const cache = new Map()
    return (text) => {
      const key = text + '␞' + raw
      const hit = cache.get(key)
      if (hit) return hit
      const str = String(text ?? '')
      if (!str) return ''
      const out = []
      let lastIdx = 0
      let match
      rgx.lastIndex = 0
      while ((match = rgx.exec(str)) !== null) {
        const start = match.index,
          end = start + match[0].length
        if (start > lastIdx) out.push(str.slice(lastIdx, start))
        out.push(
          <mark key={start} style={S.highlightMark}>
            {str.slice(start, end)}
          </mark>
        )
        lastIdx = end
        if (rgx.lastIndex === start) rgx.lastIndex++
      }
      if (lastIdx < str.length) out.push(str.slice(lastIdx))
      cache.set(key, out)
      return out
    }
  }, [keyword])
}

function resolveScrollableElement(root) {
  if (!root) return null
  const isScrollable = (el) => {
    if (!el) return false
    const cs = getComputedStyle(el)
    const oy = cs.overflowY
    return (oy === 'auto' || oy === 'scroll') && el.scrollHeight - el.clientHeight > 1
  }
  if (isScrollable(root)) return root
  const cand =
    (root.querySelector &&
      root.querySelector('[data-rw-outer], [data-virtualized-outer], .ReactVirtualized__Grid, .ReactWindow__Outer')) ||
    null
  if (isScrollable(cand)) return cand
  let cur = root
  while (cur) {
    if (isScrollable(cur)) return cur
    cur = cur.parentElement
  }
  return root
}
function scrollToBottom(el) {
  if (!el) return
  el.scrollTop = el.scrollHeight
}

function PlainLogList({ lines, detectLevel, highlight, containerRefExternal, isLoading, sessionKey }) {
  const hostRef = useRef(null)
  const scrollRef = useRef(null)
  const [rowHeight, setRowHeight] = useState(ROW_HEIGHT)
  const firstRowRef = useRef(null)

  const setHostRef = useCallback(
    (el) => {
      hostRef.current = el
      scrollRef.current = resolveScrollableElement(el)
      if (containerRefExternal) containerRefExternal.current = scrollRef.current
    },
    [containerRefExternal]
  )

  const displayLines = useMemo(() => {
    if (!Array.isArray(lines)) return []
    if (lines.length <= MAX_RENDER_LINES) return lines
    return lines.slice(lines.length - MAX_RENDER_LINES)
  }, [lines])

  const displayStart = useMemo(() => {
    const n = Array.isArray(lines) ? lines.length : 0
    return n > MAX_RENDER_LINES ? n - MAX_RENDER_LINES : 0
  }, [lines])

  const levelCacheRef = useRef(new Map())
  const getLevel = useCallback(
    (text) => {
      const c = levelCacheRef.current
      if (c.has(text)) return c.get(text)
      const v = detectLevel(text)
      c.set(text, v)
      return v
    },
    [detectLevel]
  )

  useEffect(() => {
    levelCacheRef.current = new Map()
    const el = scrollRef.current
    if (el) {
      scrollToBottom(el)
    }
  }, [sessionKey]) // rowHeight는 최초 측정으로 추후 반영

  useLayoutEffect(() => {
    const fr = firstRowRef.current
    if (fr) {
      const h = Math.ceil(fr.getBoundingClientRect().height)
      if (h > 0 && Math.abs(h - rowHeight) >= 1) setRowHeight(h)
    }
  }, [displayLines.length])

  useLayoutEffect(() => {
    const el = scrollRef.current
    if (!el) return
    scrollToBottom(el)
  }, [displayLines, rowHeight])

  useLayoutEffect(() => {
    const el = scrollRef.current
    if (!el) return
    const ro = new ResizeObserver(() => {
      scrollToBottom(el)
    })
    ro.observe(el)
    return () => ro.disconnect()
  }, [displayLines.length, rowHeight])

  return (
    <div ref={setHostRef} style={{ ...S.logBody, ...S.logBodyPlain }} role="log" aria-live="polite">
      {/* 로딩 중 */}
      {isLoading && <div style={S.logLine}>로그 로딩 중..</div>}

      {displayLines.map((line, idx) => {
        const text = String(line ?? '').replace(/\r?\n/g, ' ⏎')

        const lvl = getLevel(text)
        const style = lvl === 'WARN' ? { ...S.logLine, ...S.logLineWarn } : S.logLine
        const ref = idx === 0 ? firstRowRef : undefined

        return (
          <div key={displayStart + idx} ref={ref} style={style}>
            {highlight(text)}
          </div>
        )
      })}
    </div>
  )
}

function VirtualLogList({ lines, detectLevel, highlight, containerRefExternal, isLoading, sessionKey }) {
  const listRef = useRef(null)
  const outerWrapRef = useRef(null)

  const getEl = useCallback(() => {
    const raw =
      (listRef.current &&
        (listRef.current.element ||
          (typeof listRef.current.getElement === 'function' ? listRef.current.getElement() : null) ||
          listRef.current._outerRef ||
          (listRef.current.outerRef && listRef.current.outerRef.current) ||
          null)) ||
      outerWrapRef.current
    return resolveScrollableElement(raw)
  }, [])

  useEffect(() => {
    if (!containerRefExternal) return
    containerRefExternal.current = getEl() || null
  }, [containerRefExternal, getEl])

  const levelCacheRef = useRef(new Map())
  const getLevel = useCallback(
    (text) => {
      const c = levelCacheRef.current
      if (c.has(text)) return c.get(text)
      const v = detectLevel(text)
      c.set(text, v)
      return v
    },
    [detectLevel]
  )

  useEffect(() => {
    levelCacheRef.current = new Map()
    const el = getEl()
    if (el) {
      scrollToBottom(el)
    }
  }, [sessionKey, getEl, lines])

  useLayoutEffect(() => {
    const el = getEl()
    if (!el) return
    scrollToBottom(el)
  }, [lines, getEl])

  const [listHeight, setListHeight] = useState(MIN_LIST_HEIGHT)
  const measureNow = useCallback((retry = 0) => {
    const wrap = outerWrapRef.current
    if (!wrap) return
    const h = wrap.clientHeight || 0
    if (h <= 1) {
      if (retry < MAX_MEASURE_RETRY) requestAnimationFrame(() => measureNow(retry + 1))
      return
    }
    const cs = getComputedStyle(wrap)
    const vpad = (parseFloat(cs.paddingTop) || 0) + (parseFloat(cs.paddingBottom) || 0)
    setListHeight(Math.max(MIN_LIST_HEIGHT, h - vpad))
  }, [])
  useLayoutEffect(() => {
    const wrap = outerWrapRef.current
    if (!wrap) return
    const ro = new ResizeObserver(() => measureNow(0))
    ro.observe(wrap)
    requestAnimationFrame(() => requestAnimationFrame(() => measureNow(0)))
    return () => ro.disconnect()
  }, [measureNow])
  useLayoutEffect(() => {
    const el = getEl()
    if (!el) return
    scrollToBottom(el)
  }, [listHeight, lines, getEl])

  const Row = useCallback(
    ({ index, style, lines }) => {
      const text = String(lines[index] ?? '')
      const lvl = getLevel(text)

      const base = {
        ...style, // react-window 위치/크기(absolute, top, height 등) 유지
        ...S.logLine, // (현재는 pre-wrap인데 아래에서 덮어씀)
        height: ROW_HEIGHT, // ✅ 행 높이와 강제 일치
        lineHeight: `${ROW_HEIGHT}px`,
        whiteSpace: 'nowrap', // ✅ 줄바꿈 금지 (겹침 방지 핵심)
        overflow: 'hidden',
        textOverflow: 'ellipsis'
      }
      const rowStyle = lvl === 'WARN' ? { ...base, ...S.logLineWarn } : base
      return <div style={rowStyle}>{highlight(text)}</div>
    },
    [getLevel, highlight]
  )

  return (
    <div
      ref={outerWrapRef}
      style={{ ...S.logBody, ...S.logBodyVirtual, minHeight: MIN_LIST_HEIGHT }}
      role="log"
      aria-live="polite"
    >
      <List
        listRef={listRef}
        rowComponent={Row}
        rowCount={lines.length}
        rowHeight={ROW_HEIGHT}
        overscanCount={12}
        rowProps={{ lines }}
        style={{ height: listHeight, width: '100%' }}
      />
    </div>
  )
}

function LogsSection({
  selectedLabel,
  selectedDate,
  selectedMapId,
  isLoadingLogs,
  logError,
  logLines,
  filteredLines,
  levelFilter,
  toggleLevel,
  pendingKeyword,
  setPendingKeyword,
  handleKeywordSearchClick,
  detectLevel,
  formatDate,
  logContainerRef,
  appliedKeyword,
  emptyLogMessage,
  loadPhase
}) {
  const highlight = useHighlighter(appliedKeyword)
  const sessionKey = `${selectedLabel || ''}||${selectedDate || ''}||${selectedMapId || ''}`

  const allOn =
    !!levelFilter.INFO && !!levelFilter.WARN && !!levelFilter.ERROR && !!levelFilter.DEBUG && !!levelFilter.FATAL

  const keyword = (appliedKeyword || '').trim()
  const noKeyword = !keyword
  const filterLevelCacheRef = useRef(new Map())

  // 핵심:
  // 1) 기본 상태(전체 레벨 ON + 검색어 없음) -> raw logLines 직접 표시
  // 2) 검색어 없음 + 일부 레벨만 ON -> raw logLines를 즉석 레벨 필터
  // 3) 검색어 있음 -> filteredLines 사용
  const effectiveLines = useMemo(() => {
    const raw = Array.isArray(logLines) ? logLines : []
    const searched = Array.isArray(filteredLines) ? filteredLines : []

    const cache = filterLevelCacheRef.current

    if (noKeyword && allOn) {
      return raw
    }

    if (noKeyword) {
      const active = new Set(
        Object.entries(levelFilter)
          .filter(([, v]) => !!v)
          .map(([k]) => k)
      )
      if (active.size === 0) return []

      return raw.filter((line) => {
        if (cache.has(line)) {
          return active.has(cache.get(line))
        }

        const lvl = detectLevel(String(line ?? '')) || 'INFO'
        cache.set(line, lvl)
        return active.has(lvl)
      })
    }

    return searched
  }, [logLines, filteredLines, noKeyword, allOn, levelFilter, detectLevel])

  useEffect(() => {
    filterLevelCacheRef.current = new Map()
  }, [sessionKey])

  const showInit = loadPhase === 'init' && !isLoadingLogs
  const showEmpty = loadPhase !== 'init' && !isLoadingLogs && (effectiveLines?.length ?? 0) === 0
  {
    showEmpty && <div style={S.logLine}>{emptyLogMessage || '표시할 로그가 없습니다.'}</div>
  }

  const useVirtual = (effectiveLines?.length || 0) > VIRTUAL_THRESHOLD

  return (
    <div style={S.bottomPane}>
      <div style={S.logArea}>
        <div style={S.logHeader}>
          <span>로그</span>
          <span style={S.logMeta}>
            {selectedLabel} · {formatDate(selectedDate)} · {selectedMapId}
          </span>
        </div>

        {/* 필터 바 */}
        <div style={S.filterBar}>
          <div style={S.filterGroup}>
            <Checkbox label={'INFO'} checked={levelFilter.INFO} onChange={() => toggleLevel('INFO')} />
            <Checkbox label={'WARN'} checked={levelFilter.WARN} onChange={() => toggleLevel('WARN')} />
            <Checkbox label={'ERROR'} checked={levelFilter.ERROR} onChange={() => toggleLevel('ERROR')} />
            <Checkbox label={'DEBUG'} checked={levelFilter.DEBUG} onChange={() => toggleLevel('DEBUG')} />
            <Checkbox label={'FATAL'} checked={levelFilter.FATAL} onChange={() => toggleLevel('FATAL')} />
          </div>
          <div style={S.filterGroup}>
            <Input
              type="text"
              size="sm"
              placeholder="메시지 검색 (키워드)"
              value={pendingKeyword}
              onChange={(e) => setPendingKeyword(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleKeywordSearchClick()
              }}
            />
            <Button size="md" theme="tertiary" onClick={handleKeywordSearchClick}>
              조회
            </Button>
          </div>
        </div>
        {/* ✅ 빈 상태 문구는 여기서만 렌더 */}

        {(showInit || showEmpty) && (
          <div style={{ ...S.logBody, ...S.logBodyPlain }} role="log" aria-live="polite">
            <div style={S.logLine}>
              {showInit ? '표시할 로그가 없습니다.' : emptyLogMessage || '표시할 로그가 없습니다.'}
            </div>
          </div>
        )}

        {/* 본문 */}
        {useVirtual ? (
          <VirtualLogList
            lines={effectiveLines || []}
            detectLevel={detectLevel}
            highlight={highlight}
            containerRefExternal={logContainerRef}
            isLoading={isLoadingLogs}
            sessionKey={sessionKey}
          />
        ) : (
          <PlainLogList
            lines={effectiveLines || []}
            detectLevel={detectLevel}
            highlight={highlight}
            containerRefExternal={logContainerRef}
            isLoading={isLoadingLogs}
            sessionKey={sessionKey}
          />
        )}

        {logError && <div style={{ ...S.logLine, ...S.logLineError }}>에러: {logError}</div>}
      </div>
    </div>
  )
}

export default memo(LogsSection, (p, n) => {
  const pKey = `${p.selectedLabel || ''}||${p.selectedDate || ''}||${p.selectedMapId || ''}`
  const nKey = `${n.selectedLabel || ''}||${n.selectedDate || ''}||${n.selectedMapId || ''}`
  if (pKey !== nKey) return false

  if (p.isLoadingLogs !== n.isLoadingLogs) return false
  if ((p.logError || '') !== (n.logError || '')) return false
  if (p.loadPhase !== n.loadPhase) return false
  if (p.detectLevel !== n.detectLevel) return false
  if (p.formatDate !== n.formatDate) return false
  if (p.logContainerRef !== n.logContainerRef) return false
  if (p.handleKeywordSearchClick !== n.handleKeywordSearchClick) return false
  if (p.setPendingKeyword !== n.setPendingKeyword) return false
  if (p.toggleLevel !== n.toggleLevel) return false

  const lp = p.levelFilter || {},
    ln = n.levelFilter || {}
  if (
    lp.INFO !== ln.INFO ||
    lp.WARN !== ln.WARN ||
    lp.ERROR !== ln.ERROR ||
    lp.DEBUG !== ln.DEBUG ||
    lp.FATAL !== ln.FATAL
  )
    return false
  if ((p.pendingKeyword || '') !== (n.pendingKeyword || '')) return false
  if ((p.appliedKeyword || '') !== (n.appliedKeyword || '')) return false

  // ✅ 참조 비교: applyLogsByPlayhead가 이미 불필요한 setState를 guard하므로
  //    참조가 바뀌면 항상 re-render (window 방식에서 소량 증분도 반영)
  if (p.logLines !== n.logLines) return false
  if (p.filteredLines !== n.filteredLines) return false

  // 위 조건을 모두 통과 → 스킵
  return true
})
