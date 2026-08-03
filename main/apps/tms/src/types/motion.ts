// cloid_motion_v1 / dense_fps 포맷의 trajectory point
// time_from_start 는 초(second) 단위 실수
export interface TrajectoryPoint {
  positions: number[]
  velocities?: number[]
  time_from_start: number
}

// 파일 최상위에 joint_names / points 가 위치 (기존 trajectory 하위 구조 아님)
export interface ParsedTrajectory {
  joint_names: string[]
  points: TrajectoryPoint[]
}

export interface MotionFrame {
  t: number
  joints: Record<string, number>
}

export interface MotionData {
  frames: MotionFrame[]
}
