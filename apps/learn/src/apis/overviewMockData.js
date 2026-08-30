// TODO: 실제 API 엔드포인트 확정 후 교체
// import { client } from '@repo/apis'
// export const getLearningOverview = (range) => client(BASE_URL).get(`/api/v1/learn/overview?range=${range}`)

export const MOCK_OVERVIEW = {
  lastUpdated: '2026-06-01 13:55',
  stats: {
    successRate:    { current: 98,  delta: 12, deltaUnit: '%',   positive: true },
    totalCases:     { current: 10,  delta: 3,  deltaUnit: '개',  positive: true },
    needRetraining: { current: 5,   delta: 1,  deltaUnit: '개',  positive: false }
  },
  pipeline: [
    { name: '데이터 준비',  count: 1 },
    { name: '모델 학습',   count: 2 },
    { name: '시뮬레이션',  count: 3 },
    { name: '검증 배포',   count: 4 },
    { name: '운영중',      count: 5 }
  ],
  otaDeployment: {
    total:     10,
    before:    2,
    deploying: 2,
    completed: 6
  },
  topRunning: [
    { status: 'Running', task: '도장 플레이트 운반',   type: 'Task',  robotId: 'CLOiD001', successRate: 98.5 },
    { status: 'Running', task: '도장 플레이트 운반',   type: 'Task',  robotId: 'CLOiD012', successRate: 97.8 },
    { status: 'Running', task: '플레이트 도장',        type: 'Task',  robotId: 'CLOiD005', successRate: 97.0 },
    { status: 'Running', task: '플레이트 들어올리기',  type: 'Skill', robotId: 'CLOiD120', successRate: 96.5 },
    { status: 'Running', task: '플레이트 행잉',        type: 'Skill', robotId: 'CLOiD111', successRate: 96.0 }
  ],
  taskProgress: [
    { task: 'ari_ces_towel_folding',   collected: 950, remaining: 50  },
    { task: 'ari_ces_towel_spreading', collected: 820, remaining: 180 },
    { task: 'hang_panel_test',         collected: 0,   remaining: 100 },
    { task: 'hang_panel_v01',          collected: 80,  remaining: 920 },
    { task: 'hang_panel_v02',          collected: 280, remaining: 720 },
    { task: 'agibot_test',             collected: 0,   remaining: 100 },
    { task: 'pick_place_dice',         collected: 180, remaining: 820 },
    { task: 'pick_place_test',         collected: 10,  remaining: 990 },
    { task: 'lerobot_test',            collected: 0,   remaining: 100 },
    { task: 'pick_place_test_v2',      collected: 130, remaining: 870 },
    { task: 'pick_place_test111',      collected: 0,   remaining: 100 },
    { task: 'pick_place_test2',        collected: 80,  remaining: 920 },
    { task: 'pick_place_test3',        collected: 60,  remaining: 940 }
  ]
}

export const getLearningOverview = (_range) => Promise.resolve(MOCK_OVERVIEW)
