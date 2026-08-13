import { useEffect, useState } from 'react'
import { getSchemas } from '@/apis/adminApis'

// 테이블 메타(GET /admin/schema)는 사이드바(App)와 Admin 화면이 같이 쓴다.
// 두 곳에서 각각 호출하지 않도록 모듈 레벨에 Promise 를 캐시한다.
let schemasPromise = null

export const fetchAdminSchemas = () => {
  if (!schemasPromise) {
    schemasPromise = getSchemas().then((res) => res?.data || [])
    // 실패는 캐시하지 않는다 — 다음 진입에서 다시 시도할 수 있어야 한다.
    schemasPromise.catch(() => {
      schemasPromise = null
    })
  }
  return schemasPromise
}

/**
 * admin 테이블 메타 목록.
 * @param {boolean} [enabled] false 면 조회하지 않는다 (admin 영역 밖 / 권한 없음)
 * @returns {{ loading: boolean, schemas: import('@/apis/adminApis').AdminResourceSchema[], error: Error|null }}
 */
const useAdminSchemas = (enabled = true) => {
  const [state, setState] = useState({ loading: enabled, schemas: [], error: null })

  useEffect(() => {
    if (!enabled) {
      setState({ loading: false, schemas: [], error: null })
      return
    }
    let alive = true
    setState((prev) => ({ ...prev, loading: true }))
    fetchAdminSchemas()
      .then((schemas) => {
        if (alive) setState({ loading: false, schemas, error: null })
      })
      .catch((error) => {
        if (alive) setState({ loading: false, schemas: [], error })
      })
    return () => {
      alive = false
    }
  }, [enabled])

  return state
}

export default useAdminSchemas
