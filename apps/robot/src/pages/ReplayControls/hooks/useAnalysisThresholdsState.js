// hooks/useAnalysisThresholdsState.js
// 분석 임계값 상태 + localStorage 영속 + 기본값 복원. index.jsx에서 사용.
import { useCallback, useState } from 'react'
import { DEFAULT_ANALYSIS_THRESHOLDS, mergeThresholds } from '../analysisConfig'

const LS_KEY = 'rsp.replayControls.analysisThresholds'

function loadInitial() {
  try {
    const raw = typeof localStorage !== 'undefined' ? localStorage.getItem(LS_KEY) : null
    if (raw) return mergeThresholds(JSON.parse(raw))
  } catch {
    // 손상된 값이면 무시하고 기본값
  }
  return mergeThresholds(null)
}

export function useAnalysisThresholdsState() {
  const [thresholds, setThresholds] = useState(loadInitial)

  const updateThreshold = useCallback((group, key, value) => {
    setThresholds((prev) => {
      const v = Number(value)
      const next = { ...prev, [group]: { ...prev[group], [key]: Number.isFinite(v) ? v : prev[group][key] } }
      try {
        localStorage.setItem(LS_KEY, JSON.stringify(next))
      } catch {
        // 저장 실패는 무시(런타임엔 정상 반영)
      }
      return next
    })
  }, [])

  // groups 미지정: 전체 복원 / groups 지정: 해당 그룹만 기본값으로
  const resetThresholds = useCallback((groups) => {
    setThresholds((prev) => {
      const def = mergeThresholds(null)
      const next = !groups || !groups.length ? def : { ...prev }
      if (groups && groups.length) groups.forEach((g) => (next[g] = def[g]))
      try {
        if (JSON.stringify(next) === JSON.stringify(def)) localStorage.removeItem(LS_KEY)
        else localStorage.setItem(LS_KEY, JSON.stringify(next))
      } catch {
        // 무시
      }
      return next
    })
  }, [])

  // 기본값과 다른지 여부(설정 UI에 '기본값 복원' 활성 표시용)
  const isCustomized = JSON.stringify(thresholds) !== JSON.stringify(DEFAULT_ANALYSIS_THRESHOLDS)

  return { thresholds, updateThreshold, resetThresholds, isCustomized }
}
