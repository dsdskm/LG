export const MOCK_LEARNING_STATS = {
  lastUpdated: '2026-06-01 13:55',
  isLive: true,
  goalAchievement: {
    segments: [
      { name: '달성', value: 45, color: '#22c55e' },
      { name: '진행중', value: 38, color: '#f97316' },
      { name: '미시작/지연', value: 17, color: '#d1d5db' }
    ],
    achievedTasks: 45,
    totalTasks: 100,
    taskDelta: 5,
    isTaskIncrease: true
  },
  averageSuccessRate: {
    current: 94.6,
    prevWeek: 78.1,
    weeklyData: [
      { label: '5주전', rate: 58.4 },
      { label: '4주전', rate: 72.1 },
      { label: '3주전', rate: 65.8 },
      { label: '2주전', rate: 83.5 },
      { label: '지난주', rate: 78.1 },
      { label: '이번주', rate: 94.6 }
    ]
  },
  cumulativeAssets: {
    total: 36041,
    todayAdded: 2290,
    growthRate: 94.6,
    trendData: [
      { day: '20일', count: 9800 },
      { day: '21일', count: 13200 },
      { day: '22일', count: 15900 },
      { day: '23일', count: 21400 },
      { day: '24일', count: 25800 },
      { day: '25일', count: 29600 },
      { day: '오늘', count: 36041 }
    ]
  },
  todayLearningData: {
    count: 2418,
    unit: '에피소드',
    delta: 321,
    isIncrease: true
  },
  learningRobots: {
    active: 18,
    total: 109,
    delta: 3,
    isIncrease: true
  },
  pipeline: {
    stages: [
      { name: '데이터 준비', count: 100 },
      { name: '모델 학습', count: 546 },
      { name: '시뮬레이션', count: 3766 },
      { name: '검증 배포', count: 4556 },
      { name: '운영중', count: 333 }
    ],
    connectionStatus: 'Connected',
    connectionLabel: 'PhysicalWorks Forge'
  }
}

// ─────────────────────────────────────────────────────────────────
// 데이터 수집 현황 (Forge 학습 데이터 생산 KPI)
//  1) 누적 학습 데이터 (Total Training Episodes)
//  2) 월간 데이터 목표 실적 (Monthly Episode Goal Progress)
//  3) 일간 데이터 목표 실적 (Daily Episode Goal Progress)
//  4) 데이터 품질 추이 (Data Quality Rate)
//  5) 스토리지 사용량 (Storage Used)
//  * 모든 KPI 그래프는 아래 시계열(실 데이터)로 렌더링되며,
//    시간축에 따라 증감 폭이 뚜렷하도록 구성.
// ─────────────────────────────────────────────────────────────────
export const MOCK_COLLECTION_STATS = {
  lastUpdated: '2026-07-07 15:42',
  isLive: true,
  forge: { label: 'PhysicalWorks Forge', status: 'Connected' },

  // 1) 누적 학습 데이터 — 누적 Episode(면적 그래프), 전일 증감, 누적 학습시간
  cumulative: {
    episodes: 56041,          // Figma: 56,041 Episodes
    totalDurationH: 12450,    // Total Duration 12,450 h (Teleop)
    teleopLabel: 'Teleop',
    deltaYesterday: 2290,     // + 2,290 전일
    // 평균 생산량 (월간/일간/시간당) — Figma 하단 보조 지표
    // TODO: 정확한 API 확정 시 교체
    avgProduction: { monthly: 7000, daily: 565, hourly: 56 },
    // 누적 곡선: 완만 → 급증 구간이 보이도록
    trend: [
      { i: 0, month: 'Nov', value: 33000 },
      { i: 1, month: 'Dec', value: 35600 },
      { i: 2, month: 'Jan', value: 37800 },
      { i: 3, month: 'Feb', value: 40900 },
      { i: 4, month: 'Mar', value: 44200 },
      { i: 5, month: 'Apr', value: 47100 },
      { i: 6, month: 'May', value: 49600 },
      { i: 7, month: 'Jun', value: 52400 },
      { i: 8, month: 'Jul', value: 54700 },
      { i: 9, month: 'Aug', value: 56041 }
    ]
  },

  // 2) 월간 데이터 목표 실적 — 목표량(점선)/실적량(면적)/누적시간(막대, 우축 h)
  monthly: {
    actual: 5850,             // Figma: 5,850
    target: 6500,             // / 6,500 Episodes
    vsPlanPct: 5,             // 계획 대비 +5%p
    deltaPrev: 1500,          // + 1,500 전월
    achievementPct: 90,       // 달성률 말풍선 90%
    periodLabel: '8월 생산량',
    data: [
      { month: 'Mar', target: 2400, actual: 2100, cumTime: 35 },
      { month: 'Apr', target: 2800, actual: 2500, cumTime: 70 },
      { month: 'May', target: 3200, actual: 2900, cumTime: 105 },
      { month: 'Jun', target: 3800, actual: 3300, cumTime: 140 },
      { month: 'July', target: 5000, actual: 4200, cumTime: 168 },
      { month: 'Aug', target: 6500, actual: 5850, cumTime: 190 }
    ]
  },

  // 3) 일간 데이터 목표 실적 — 목표량(점선)/실적량(면적)
  daily: {
    actual: 400,              // Figma: 400
    target: 500,              // / 500 Episodes
    vsPlanPct: 5,
    deltaPrev: 23,            // +23 전일
    achievementPct: 70,       // 달성률 말풍선 70%
    periodLabel: '8월 생산량',
    data: [
      { day: '08/08', target: 300, actual: 250 },
      { day: '08/09', target: 330, actual: 285 },
      { day: '08/10', target: 360, actual: 315 },
      { day: '08/11', target: 400, actual: 350 },
      { day: '08/12', target: 440, actual: 375 },
      { day: '08/13', target: 470, actual: 390 },
      { day: '08/14', target: 500, actual: 400 }
    ]
  },

  // 4) 데이터 품질 추이 — 월별 통과율(막대) + 목표(점선)
  quality: {
    current: 94.5,            // Figma: 94.5 %
    deltaPct: 5.0,            // + 5% 전월
    data: [
      { month: 'Mar', rate: 89.5, target: 91 },
      { month: 'Apr', rate: 90.8, target: 91.5 },
      { month: 'May', rate: 91.5, target: 92 },
      { month: 'Jun', rate: 92.4, target: 92.5 },
      { month: 'July', rate: 91.6, target: 93 },
      { month: 'Aug', rate: 94.5, target: 93.5 }
    ]
  },

  // 5) 스토리지 사용량 — 사용량(GB), 총 용량, 사용률(%)
  storage: {
    gb: 103.7,               // Figma: 103.7 GB
    totalLabel: '1 TB',      // 총 용량
    deltaGb: 1.5,            // + 1.5G 전월
    usedPct: 10              // 10%
  }
}

// ─────────────────────────────────────────────────────────────────
// 로봇 상태 층별 분배 (Figma: 각 상태 1F/2F/3F Unit 표기)
//  실제 층별 집계 API 부재 → 총계를 아래 비율로 분배해 표기.
//  TODO: 정확한 층별 API 확정 시 이 mock 제거하고 실데이터로 교체.
// ─────────────────────────────────────────────────────────────────
export const MOCK_FLOOR_RATIO = { '1F': 0.5, '2F': 0.3, '3F': 0.2 }
