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
// ★ 이 토픽의 pose 는 lio_odom 프레임 기준이다 — 지도(map) 기준 위치가 아니다.
//   지도 위에 로봇을 그릴 때는 TF_TOPICS 를 합성한 map->base_link 를 쓴다(@/utils/tf).
//   여기서는 속도/원본 값 표시용으로만 유지한다.
export const ODOM_TOPICS = ['/lio/odom', '/odom']

// 좌표 변환 트리 (tf2_msgs/TFMessage). 후보 중 하나가 아니라 둘 다 구독한다.
export const TF_TOPICS = ['/tf', '/tf_static']

// 로봇 외형 폴리곤 (geometry_msgs/PolygonStamped) — nav2 costmap 이 발행한다.
// 지도 위 로봇 마커를 실제 치수로 그리는 데 쓴다. 없으면 MapCanvas 가 상수 반경으로 폴백한다.
// global 은 map 프레임이라 그대로 쓸 수 있고, local 은 costmap global_frame(보통 odom)
// 기준이라 frameCorrections 로 보정해야 하므로 global 을 먼저 고른다.
export const FOOTPRINT_TOPICS = ['/global_costmap/published_footprint', '/local_costmap/published_footprint']

// 3D 라이다 점군 (sensor_msgs/PointCloud2)
// 센서 원본(hesai_lidar 프레임)만 사용한다 — MapCanvas가 odom pose로 월드 변환하므로
// 이미 월드 좌표인 /lio/vis_deskewed_cloud를 넣으면 이중 변환된다.
export const SCAN_TOPICS = ['/lidar_points']

// 매핑/측위 진행 상태 (std_msgs/String)
export const STATUS_TOPICS = ['/lio_node/status']

// 주행 궤적 (nav_msgs/Path) — lio_node 가 매핑/측위 중 누적 경로를 발행한다.
// lio_odom 프레임 기준이라 지도 위에 겹칠 때는 frameCorrections 로 보정한다(MapCanvas).
export const TRAJECTORY_TOPICS = ['/lio/path']

// 비상정지 버튼(하드웨어 키) 상태 (power_on_micom_msgs/EmergencyKeyStatus, uint8 emergency_key).
// power-on-micom 이 CAN 0x700 을 받을 때마다(약 1Hz) 발행한다 — 0=Released, 1=Detected(눌림).
// 소프트 E-Stop 명령 채널인 /e_stop(std_msgs/Bool)과는 다른 토픽이다: 그쪽은 앱이 걸는 명령이고
// 이쪽이 사람이 누른 물리 버튼의 실제 상태다. 판정은 @/utils/emergencyKey 가 한다.
export const EMERGENCY_TOPICS = ['/emergency_key_status']

// 주행(Nav2) 진행 상태 (std_msgs/String, JSON: { cruise, goto_status }).
// corepath 의 nav_action_command_handler 가 액션 goal/feedback/result 를 추적해 재발행한다 —
// 이동 명령은 gRPC(navApis)로 보내고 진행 상태는 이 토픽으로만 받는다(gRPC 상태 조회 금지 규칙).
export const NAV_STATUS_TOPICS = ['/robot_hub/nav_action_status']

// 제자리 회전 진행 상태 (std_msgs/String, JSON: { active, state, target_deg, actual_deg, message }).
// motor-2wheel 의 WheelCommandHandler 가 /cmd_vel 제어 중 발행한다 — GKR 재정위 보조 회전용.
export const SPIN_STATUS_TOPICS = ['/robot_hub/nav_spin_status']

// MapCanvas가 그릴 수 있는 기하 토픽 전체
export const SPATIAL_TOPICS = [
  ...MAP_TOPICS,
  ...ODOM_TOPICS,
  ...SCAN_TOPICS,
  ...TF_TOPICS,
  ...FOOTPRINT_TOPICS,
  ...TRAJECTORY_TOPICS,
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
  'geometry_msgs/msg/PolygonStamped',
  'power_on_micom_msgs/msg/EmergencyKeyStatus',
  'nav_msgs/msg/OccupancyGrid',
  'nav_msgs/msg/Odometry',
  'nav_msgs/msg/Path',
  'sensor_msgs/msg/LaserScan',
  'sensor_msgs/msg/PointCloud2',
  'std_msgs/msg/String',
  'tf2_msgs/msg/TFMessage'
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
  if (TF_TOPICS.includes(topic)) return 'tf'
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
