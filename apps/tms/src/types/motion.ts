export interface TrajectoryPoint {
  positions: number[]
  time_from_start: {
    sec: number
    nanosec: number
  }
}

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
