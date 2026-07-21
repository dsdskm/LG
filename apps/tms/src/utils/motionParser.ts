import { ParsedTrajectory } from '@/types/motion'
import { parse } from 'yaml'

export function parseMotionYaml(yamlText: string) {
  try {
    const rawData = parse(yamlText)

    const trajectory: ParsedTrajectory = rawData.trajectory

    // R3F 애니메이션에서 쓰기 편하게 초(second) 단위 정보를 포함하여 리턴
    const formattedPoints = trajectory.points.map((point) => {
      // sec와 nanosec를 합쳐 완전한 초(double) 단위로 계산 (예: 10.0초)
      const totalSeconds = point.time_from_start.sec + point.time_from_start.nanosec / 1_000_000_000

      return {
        t: totalSeconds,
        joints: Object.fromEntries(trajectory.joint_names.map((key, index) => [key, point.positions[index]]))
      }
    })

    return {
      frameRate: 0,
      frames: formattedPoints
    }
  } catch (error) {
    console.error('YAML 파싱 실패:', error)
  }
}
