// src/pages/Logreplay/hooks/useLogSearch.js
// 역할: logSearch.worker.js를 Comlink로 감싼 React 훅을 제공.

// 아무 로직 없이, 의존성 인식용
import 'flexsearch'

import { useEffect, useRef, useCallback, useState } from 'react'
import * as Comlink from 'comlink'

export function useLogSearch() {
  const workerRef = useRef(null)
  const apiRef = useRef(null)

  const [ready, setReady] = useState(false)
  const [stats, setStats] = useState({ count: 0, byLevel: {} })

  // 워커 스폰 & Comlink 래핑
  useEffect(() => {
    // SSR 환경 방어 (클라이언트에서만 워커 생성)
    if (typeof window === 'undefined') return

    // Vite/CRA/Next(웹팩)에서 통용되는 module worker 생성 패턴
    const worker = new Worker(new URL('../workers/logSearch.worker.js', import.meta.url), { type: 'module' })

    const api = Comlink.wrap(worker)
    workerRef.current = worker
    apiRef.current = api
    setReady(true)

    return () => {
      try {
        workerRef.current?.terminate()
      } finally {
        workerRef.current = null
        apiRef.current = null
        setReady(false)
      }
    }
  }, [])

  // 전체 초기화
  const clear = useCallback(async () => {
    if (!apiRef.current) return
    await apiRef.current.clear()
    setStats({ count: 0, byLevel: {} })
  }, [])

  // 증분 인덱싱 (onBatch에서 계속 호출)
  const add = useCallback(
    async (lines) => {
      if (!apiRef.current || !Array.isArray(lines) || lines.length === 0) {
        return { added: [], total: stats.count }
      }

      // structured clone 안전성/일관성 확보를 위해 ts/level/text만 정규화
      const normalized = lines.map((l) => ({
        ts: typeof l.ts === 'number' ? l.ts : Number(l.ts) || Date.parse(l.ts) || 0,
        level: String(l.level || 'INFO').toUpperCase(),
        text: String(l.text ?? ''),
        pbMs: typeof l.pbMs === 'number' ? l.pbMs : l.pbMs == null ? null : Number(l.pbMs) || null
      }))

      const res = await apiRef.current.add(normalized)
      const st = await apiRef.current.stats()
      if (st) setStats(st)
      return res // { added: number[], total: number }
    },
    [stats.count]
  )

  // 검색 (레벨 필터 + 키워드)

  const query = useCallback(async ({ levels, keyword, sortBy = 'tsAsc', limit = 50000, timeRange } = {}) => {
    if (!apiRef.current) return { items: [], total: 0 }
    return await apiRef.current.query({ levels, keyword, sortBy, limit, timeRange })
    // 반환값: { items: Array<{id,ts,level,text,pbMs}>, total: number }
  }, [])

  // 통계 갱신
  const getStats = useCallback(async () => {
    if (!apiRef.current) return stats
    const st = await apiRef.current.stats()
    if (st) setStats(st)
    return st
  }, [stats])

  return {
    ready, // 워커 준비 여부
    clear, // 전체 초기화
    add, // 증분 인덱싱
    query, // 검색 실행
    stats, // 마지막 통계 스냅샷
    getStats // 워커에서 최신 통계 가져와서 갱신
  }
}

export default useLogSearch
