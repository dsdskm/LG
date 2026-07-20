export const TAB_ID = {
  EVENTS: 'events',
  STATS: 'stats',
  REPORT: 'report',
  SETTINGS: 'settings'
}

export const ALL_VALUE = 'all'

export const severityLabelMap = {
  critical: 'Critical',
  high: 'High',
  medium: 'Medium',
  low: 'Low'
}

export const statusLabelMap = {
  received: '로그 획득',
  prepared: '분석 준비 완료',
  prepare_failed: '분석 준비 실패',
  analyzing: '분석중',
  analyzed: '분석 완료',
  analyze_failed: '분석 실패',
  completed: '조치 완료',
  failed: '오류 발생'
}

export const STATUS_OPTIONS = [
  { value: ALL_VALUE, name: '상태 전체' },
  { value: 'received', name: statusLabelMap.received },
  { value: 'prepared', name: statusLabelMap.prepared },
  { value: 'prepare_failed', name: statusLabelMap.prepare_failed },
  { value: 'analyzing', name: statusLabelMap.analyzing },
  { value: 'analyzed', name: statusLabelMap.analyzed },
  { value: 'analyze_failed', name: statusLabelMap.analyze_failed },
  { value: 'completed', name: statusLabelMap.completed },
  { value: 'failed', name: statusLabelMap.failed }
]

export const SEVERITY_OPTIONS = [
  { value: ALL_VALUE, name: 'Level 전체' },
  { value: 'critical', name: 'Critical' },
  { value: 'high', name: 'High' },
  { value: 'medium', name: 'Medium' },
  { value: 'low', name: 'Low' }
]

