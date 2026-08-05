/**
 * Map 페이지가 다루는 ROS2 토픽 정의 (SSOT).
 *
 * 로봇 구성에 따라 같은 역할을 다른 토픽 이름으로 발행한다.
 *   - LIO(lio-fr-system): /lio/grid_map, /lio/odom
 *   - Cartographer      : /map, /odom
 * 따라서 역할(category)별 후보 목록을 두고, foxglove-bridge가 advertise한
 * 토픽 중 실제로 존재하는 첫 번째 것을 골라 구독한다.
 *
 * 배열 순서 = 우선순위 (앞쪽이 먼저 선택된다).
 */

// 2D 격자 지도 (nav_msgs/OccupancyGrid)
export const MAP_TOPICS = ['/lio/grid_map', '/map']

// 로봇 위치 (nav_msgs/Odometry)
export const ODOM_TOPICS = ['/lio/odom', '/odom']

// 3D 라이다 점군 (sensor_msgs/PointCloud2)
// 센서 원본(hesai_lidar 프레임)만 사용한다 — MapCanvas가 odom pose로 월드 변환하므로
// 이미 월드 좌표인 /lio/vis_deskewed_cloud를 넣으면 이중 변환된다.
export const SCAN_TOPICS = ['/lidar_points']

// 매핑/측위 진행 상태 (std_msgs/String)
export const STATUS_TOPICS = ['/lio_node/status']

// MapCanvas가 그릴 수 있는 기하 토픽 전체
export const SPATIAL_TOPICS = [
  ...MAP_TOPICS,
  ...ODOM_TOPICS,
  ...SCAN_TOPICS,
  '/tf',
  '/tf_static',
  '/lio/path',
  '/scan_matched_points2',
  '/trajectory_node_list',
  '/constraint_list',
  '/landmark_poses_list',
  '/map_updates',
  '/initialpose',
  '/goal_pose',
  '/clicked_point'
]

// cdrParser.js가 해석할 수 있는 스키마. 그 외에는 JSON으로 취급한다.
const CDR_SCHEMAS = new Set([
  'nav_msgs/msg/OccupancyGrid',
  'nav_msgs/msg/Odometry',
  'nav_msgs/msg/Path',
  'sensor_msgs/msg/LaserScan',
  'sensor_msgs/msg/PointCloud2',
  'std_msgs/msg/String'
])

/**
 * 구독 시 사용할 인코딩을 스키마로 결정한다.
 * 토픽 이름 하드코딩 대신 파서 지원 여부로 판단하므로, 새 토픽을 추가할 때
 * 인코딩 목록을 따로 손댈 필요가 없다.
 */
export function encodingFor(schemaName) {
  return CDR_SCHEMAS.has(schemaName) ? 'cdr' : 'json'
}

/** 토픽이 어느 역할인지 반환한다. 해당 없으면 null. */
export function topicCategory(topic) {
  if (MAP_TOPICS.includes(topic)) return 'map'
  if (ODOM_TOPICS.includes(topic)) return 'odom'
  if (SCAN_TOPICS.includes(topic)) return 'scan'
  return null
}

/** 후보 중 실제 advertise된 첫 번째 토픽을 고른다. 없으면 null. */
export function resolveTopic(candidates, availableTopics) {
  return candidates.find((topic) => availableTopics.includes(topic)) ?? null
}

/** 구독 목록에서 해당 역할로 구독 중인 토픽 이름을 반환한다. 없으면 null. */
export function subscribedTopicOf(subscribedTopics, category) {
  return subscribedTopics.find((topic) => topicCategory(topic) === category) ?? null
}
