// AnalysisThresholdsContext.jsx
// 분석 임계값을 탭들에 prop-drilling 없이 전달. Provider가 없어도 기본값으로 동작 → 롤백 안전.
import { createContext, useContext } from 'react'
import { DEFAULT_ANALYSIS_THRESHOLDS } from './analysisConfig'

const AnalysisThresholdsContext = createContext(DEFAULT_ANALYSIS_THRESHOLDS)

export const AnalysisThresholdsProvider = AnalysisThresholdsContext.Provider

// 탭에서 사용: const thresholds = useAnalysisThresholds()
export function useAnalysisThresholds() {
  return useContext(AnalysisThresholdsContext)
}
