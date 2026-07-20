// src/pages/Logreplay/workers/logSearch.worker.js
// 워커: FlexSearch 인덱스를 유지하고 증분 add/검색(query)/초기화(clear)/통계(stats)를 노출.
// 메인 스레드와의 통신은 Comlink로 처리(다음 단계에서 wrap).

import { Index } from 'flexsearch'
import { expose } from 'comlink'

// ---- FlexSearch 인덱스 설정 ----
// 한국어/영문 혼합에서도 기본 설정으로 시작하고,
// 필요시 tokenize/charset 등의 옵션을 후속 단계에서 튜닝하자.
const index = new Index({
  tokenize: 'forward',
  cache: true,
  optimize: true
  // charset, encode 등은 데이터 특성 보면서 조정 가능
})

const state = {
  nextId: 0,
  // id -> { ts:number, level:string, text:string }
  entries: [],
  // 레벨 인덱스: level -> id[]
  levelMap: {
    INFO: [],
    WARN: [],
    ERROR: [],
    DEBUG: [],
    FATAL: []
  }
}

// 증분 추가
function add(lines) {
  // lines: Array<{ ts:number|Date|string, level:string, text:string }>
  const added = []
  for (const line of lines) {
    const id = state.nextId++
    const ts = Number(line?.ts) || 0
    const level = String(line?.level || 'INFO').toUpperCase()
    const text = String(line?.text ?? '')
    const pbMsRaw = line?.pbMs
    const pbMs = Number.isFinite(pbMsRaw) ? Number(pbMsRaw) : pbMsRaw == null ? null : Number(pbMsRaw) || null

    state.entries[id] = { ts, level, text, pbMs }
    if (!state.levelMap[level]) state.levelMap[level] = []
    state.levelMap[level].push(id)

    // FlexSearch에 id와 검색 대상 텍스트 추가
    index.add(id, text)
    added.push(id)
  }
  return { added, total: state.nextId }
}

function clear() {
  index.clear()
  state.nextId = 0
  state.entries = []
  state.levelMap = { INFO: [], WARN: [], ERROR: [], DEBUG: [], FATAL: [] }
  return true
}

function stats() {
  return {
    count: state.nextId,
    byLevel: Object.fromEntries(Object.entries(state.levelMap).map(([k, v]) => [k, v.length]))
  }
}

// 내부 유틸: 레벨 후보 만들기
function unionLevels(levels) {
  if (!levels || levels.length === 0) {
    // 레벨 제한이 없으면 전체 id
    return Array.from({ length: state.nextId }, (_, i) => i)
  }
  const tmp = []
  for (const lv of levels) {
    const list = state.levelMap[lv] || []
    tmp.push(...list)
  }
  tmp.sort((a, b) => a - b)
  const out = []
  for (let i = 0; i < tmp.length; i++) {
    if (i === 0 || tmp[i] !== tmp[i - 1]) out.push(tmp[i])
  }
  return out
}

function intersect(a, b) {
  const setB = new Set(b)
  return a.filter((id) => setB.has(id))
}

function filterByTimeRange(ids, timeRange) {
  if (!timeRange) return ids
  const from = Number(timeRange.from)
  const to = Number(timeRange.to)
  if (!Number.isFinite(from) || !Number.isFinite(to)) return ids
  const lo = Math.min(from, to)
  const hi = Math.max(from, to)
  return ids.filter((id) => {
    const e = state.entries[id]
    const pb = e?.pbMs
    if (!Number.isFinite(pb)) return false
    return pb >= lo && pb <= hi
  })
}
// 검색: 레벨 필터 + 키워드
async function query({ levels, keyword = '', sortBy = 'tsAsc', limit = 50000, timeRange = null } = {}) {
  const levelIds = unionLevels(levels)
  let ids

  if (!keyword || keyword.trim() === '') {
    ids = levelIds
  } else {
    const res = await index.search({ query: keyword, limit })
    const resultIds = Array.isArray(res)
      ? res.map((r) => (typeof r === 'number' ? r : r?.id)).filter((x) => x !== undefined)
      : []
    ids = intersect(resultIds, levelIds)
  }

  ids = filterByTimeRange(ids, timeRange)
  // 타임스탬프 기반 정렬
  ids.sort((a, b) => {
    const ea = state.entries[a]
    const eb = state.entries[b]
    if (sortBy === 'pbAsc') return (ea?.pbMs ?? 0) - (eb?.pbMs ?? 0) || a - b
    if (sortBy === 'pbDesc') return (eb?.pbMs ?? 0) - (ea?.pbMs ?? 0) || a - b
    if (sortBy === 'tsDesc') return (eb?.ts ?? 0) - (ea?.ts ?? 0) || a - b
    return (ea?.ts ?? 0) - (eb?.ts ?? 0) || a - b
  })

  if (limit && ids.length > limit) ids = ids.slice(0, limit)

  // ✅ 핵심: 메인 스레드가 logLines[id]로 매핑하지 않도록
  // 검색 결과를 entry 자체로 반환한다.
  const items = ids
    .map((id) => {
      const e = state.entries[id]
      if (!e) return null
      return { id, ts: e.ts, level: e.level, text: e.text, pbMs: e.pbMs }
    })
    .filter(Boolean)

  return { items, total: items.length }
}

// Comlink로 워커 API 노출
expose({ add, query, clear, stats })
