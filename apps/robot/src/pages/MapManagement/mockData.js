export const UNREGISTERED = '__unregistered__'

export const groups = [
  {
    id: 'g1',
    name: 'Group A',
    sites: [
      { id: 's1', name: 'Site A-1' },
      { id: 's2', name: 'Site A-2' }
    ]
  },
  {
    id: 'g2',
    name: 'Group B',
    sites: [{ id: 's3', name: 'Site B-1' }]
  },
  {
    id: 'g3',
    name: 'Group C',
    sites: [
      { id: 's4', name: 'Site C-1' },
      { id: 's5', name: 'Site C-2' }
    ]
  }
]

export const robots = [
  {
    id: 'r1',
    name: 'robot1',
    model: 'RX-200',
    status: '운영',
    group: 'Group A',
    site: 'Site A-1',
    macAddress: 'AA:BB:CC:01:23:01',
    mapId: 'map1'
  },
  {
    id: 'r2',
    name: 'robot2',
    model: 'RX-200',
    status: '운영',
    group: 'Group A',
    site: 'Site A-1',
    macAddress: 'AA:BB:CC:01:23:02',
    mapId: 'map1'
  },
  {
    id: 'r3',
    name: 'robot3',
    model: 'RX-100',
    status: '대기',
    group: 'Group A',
    site: 'Site A-2',
    macAddress: 'AA:BB:CC:01:23:03',
    mapId: 'map7'
  },
  {
    id: 'r4',
    name: 'robot4',
    model: 'RX-300',
    status: '대기',
    group: 'Group B',
    site: 'Site B-1',
    macAddress: 'AA:BB:CC:01:23:04',
    mapId: 'map4'
  },
  {
    id: 'r5',
    name: 'robot5',
    model: 'RX-200',
    status: '대기',
    group: 'Group B',
    site: 'Site B-1',
    macAddress: 'AA:BB:CC:01:23:05',
    mapId: 'map4'
  },
  {
    id: 'r6',
    name: 'robot6',
    model: 'RX-100',
    status: '에러',
    group: 'Group A',
    site: 'Site A-1',
    macAddress: 'AA:BB:CC:01:23:06',
    mapId: 'map1'
  },
  {
    id: 'r7',
    name: 'robot7',
    model: 'RX-300',
    status: '충전',
    group: 'Group C',
    site: 'Site C-1',
    macAddress: 'AA:BB:CC:01:23:07',
    mapId: 'map8'
  },
  {
    id: 'r8',
    name: 'robot8',
    model: 'RX-200',
    status: '운영',
    group: 'Group C',
    site: 'Site C-2',
    macAddress: 'AA:BB:CC:01:23:08',
    mapId: 'map6'
  },
  {
    id: 'r9',
    name: 'robot9',
    model: 'RX-100',
    status: '오프라인',
    group: 'Group A',
    site: 'Site A-1',
    macAddress: 'AA:BB:CC:01:23:09',
    mapId: null
  },
  {
    id: 'r10',
    name: 'robot10',
    model: 'RX-200',
    status: '운영',
    group: 'Group B',
    site: 'Site B-1',
    macAddress: 'AA:BB:CC:01:23:10',
    mapId: 'map4'
  },
  {
    id: 'r13',
    name: 'robot13',
    model: 'RX-100',
    status: '대기',
    group: '',
    site: '',
    macAddress: 'AA:BB:CC:01:23:13',
    mapId: 'map9'
  },
  {
    id: 'r14',
    name: 'robot14',
    model: 'RX-300',
    status: '운영',
    group: '',
    site: '',
    macAddress: 'AA:BB:CC:01:23:14',
    mapId: 'map10'
  }
]

export const siteMaps = [
  {
    id: 'map1',
    ownerType: 'site',
    ownerRobotId: null,
    mapType: 'SLAM',
    status: 'Active',
    site: 'Site A-1',
    siteId: 's1',
    group: 'Group A',
    createdAt: '2025-08-15 09:00',
    updatedAt: '2026-03-08 14:30',
    zones: [
      {
        id: 'z1',
        name: '출입구 금지구역',
        type: 'no-go',
        points: [
          { x: 10, y: 10 },
          { x: 25, y: 10 },
          { x: 25, y: 22 },
          { x: 10, y: 22 }
        ],
        memo: '메인 출입구'
      }
    ],
    resolution: { width: 100, height: 100 },
    obstacles: [{ x: 40, y: 20, w: 8, h: 6 }],
    walls: [
      { x1: 0, y1: 0, x2: 100, y2: 0 },
      { x1: 100, y1: 0, x2: 100, y2: 100 },
      { x1: 100, y1: 100, x2: 0, y2: 100 },
      { x1: 0, y1: 100, x2: 0, y2: 0 }
    ],
    drivableArea: { x: 0, y: 0, w: 100, h: 100 },
    updateHistory: [
      { id: 'uh1', date: '2025-08-15 09:00', type: '초기 등록', description: '맵 초기 등록', operator: 'admin' },
      { id: 'uh2', date: '2026-03-08 14:30', type: '금지구역 변경', description: '금지구역 추가', operator: 'admin' }
    ]
  },
  {
    id: 'map2',
    ownerType: 'site',
    ownerRobotId: null,
    mapType: 'Grid',
    status: 'Active',
    site: 'Site A-1',
    siteId: 's1',
    group: 'Group A',
    createdAt: '2025-09-01 11:00',
    updatedAt: '2026-02-20 10:15',
    zones: [],
    resolution: { width: 100, height: 100 },
    obstacles: [],
    walls: [],
    drivableArea: { x: 0, y: 0, w: 100, h: 100 },
    updateHistory: []
  },
  {
    id: 'map3',
    ownerType: 'site',
    ownerRobotId: null,
    mapType: 'SLAM',
    status: 'Draft',
    site: 'Site A-2',
    siteId: 's2',
    group: 'Group A',
    createdAt: '2026-03-01 15:00',
    updatedAt: '2026-03-09 09:45',
    zones: [],
    resolution: { width: 100, height: 100 },
    obstacles: [],
    walls: [],
    drivableArea: { x: 0, y: 0, w: 100, h: 100 },
    updateHistory: []
  },
  {
    id: 'map4',
    ownerType: 'site',
    ownerRobotId: null,
    mapType: 'Real Map',
    status: 'Active',
    site: 'Site B-1',
    siteId: 's3',
    group: 'Group B',
    createdAt: '2025-06-10 08:30',
    updatedAt: '2026-03-05 16:20',
    zones: [
      {
        id: 'z4',
        name: '적재 구역 A',
        type: 'no-go',
        points: [
          { x: 5, y: 5 },
          { x: 30, y: 5 },
          { x: 30, y: 25 },
          { x: 5, y: 25 }
        ],
        memo: '중장비 적재 영역'
      }
    ],
    resolution: { width: 100, height: 100 },
    obstacles: [],
    walls: [],
    drivableArea: { x: 0, y: 0, w: 100, h: 100 },
    updateHistory: []
  },
  {
    id: 'map5',
    ownerType: 'site',
    ownerRobotId: null,
    mapType: 'SLAM',
    status: 'Deprecated',
    site: 'Site C-1',
    siteId: 's4',
    group: 'Group C',
    createdAt: '2025-03-20 10:00',
    updatedAt: '2025-12-15 11:00',
    zones: [],
    resolution: { width: 100, height: 100 },
    obstacles: [],
    walls: [],
    drivableArea: { x: 0, y: 0, w: 100, h: 100 },
    updateHistory: []
  },
  {
    id: 'map6',
    ownerType: 'site',
    ownerRobotId: null,
    mapType: 'Grid',
    status: 'Active',
    site: 'Site C-2',
    siteId: 's5',
    group: 'Group C',
    createdAt: '2025-11-01 14:00',
    updatedAt: '2026-03-07 08:30',
    zones: [],
    resolution: { width: 100, height: 100 },
    obstacles: [],
    walls: [],
    drivableArea: { x: 0, y: 0, w: 100, h: 100 },
    updateHistory: []
  },
  {
    id: 'map7',
    ownerType: 'robot',
    ownerRobotId: 'r3',
    mapType: 'SLAM',
    status: 'Active',
    site: 'Site A-2',
    siteId: 's2',
    group: 'Group A',
    createdAt: '2026-03-01 15:00',
    updatedAt: '2026-03-09 09:45',
    zones: [],
    resolution: { width: 100, height: 100 },
    obstacles: [],
    walls: [],
    drivableArea: { x: 0, y: 0, w: 100, h: 100 },
    updateHistory: []
  },
  {
    id: 'map8',
    ownerType: 'robot',
    ownerRobotId: 'r7',
    mapType: 'SLAM',
    status: 'Active',
    site: 'Site C-1',
    siteId: 's4',
    group: 'Group C',
    createdAt: '2025-03-20 10:00',
    updatedAt: '2025-12-15 11:00',
    zones: [],
    resolution: { width: 100, height: 100 },
    obstacles: [],
    walls: [],
    drivableArea: { x: 0, y: 0, w: 100, h: 100 },
    updateHistory: []
  },
  {
    id: 'map9',
    ownerType: 'robot',
    ownerRobotId: 'r13',
    mapType: 'SLAM',
    status: 'Active',
    site: '',
    siteId: '',
    group: '',
    createdAt: '2026-01-20 09:00',
    updatedAt: '2026-03-10 10:00',
    zones: [],
    resolution: { width: 100, height: 100 },
    obstacles: [],
    walls: [],
    drivableArea: { x: 0, y: 0, w: 100, h: 100 },
    updateHistory: []
  },
  {
    id: 'map10',
    ownerType: 'robot',
    ownerRobotId: 'r14',
    mapType: 'Grid',
    status: 'Active',
    site: '',
    siteId: '',
    group: '',
    createdAt: '2026-02-05 11:30',
    updatedAt: '2026-03-10 12:30',
    zones: [],
    resolution: { width: 100, height: 100 },
    obstacles: [],
    walls: [],
    drivableArea: { x: 0, y: 0, w: 100, h: 100 },
    updateHistory: []
  }
]

export const getRobotsForMap = (mapId) => robots.filter((r) => r.mapId === mapId)
export const getRegisteredRobotsForSite = (siteName) => robots.filter((r) => r.site === siteName)

export const getMapDisplayName = (map) => {
  if (map.ownerType === 'site') return map.site || '(미등록)'
  const robot = robots.find((r) => r.id === map.ownerRobotId)
  if (!robot) return 'Unknown'
  return `${robot.name} (${robot.macAddress})`
}
