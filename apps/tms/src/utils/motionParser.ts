import { MotionData, ParsedTrajectory } from '@/types/motion'
import { parse } from 'yaml'

/**
 * cloid_motion_v1 / dense_fps 포맷의 trajectory 텍스트를 파싱한다.
 * - 최상위 joint_names / points 사용
 * - time_from_start 는 초(second) 단위 실수
 * - 관절 이름은 이미 URDF 실제 이름이므로 별도 매핑 없음
 * - time_from_start 오프셋을 제거하여 첫 프레임을 0초 기준으로 정규화
 */
export function parseMotionYaml(yamlText: string): MotionData | undefined {
  try {
    const raw = parse(yamlText) as ParsedTrajectory

    if (!raw?.joint_names || !Array.isArray(raw.points) || raw.points.length === 0) {
      console.error('모션 파싱 실패: joint_names 또는 points 가 없습니다.')
      return undefined
    }

    const jointNames = raw.joint_names
    // 첫 프레임 시간을 빼서 0초부터 재생되도록 정규화 (파일의 3.0초 오프셋 제거)
    const t0 = raw.points[0].time_from_start ?? 0

    const frames = raw.points.map((point) => ({
      t: (point.time_from_start ?? 0) - t0,
      joints: Object.fromEntries(jointNames.map((name, index) => [name, point.positions[index]]))
    }))

    return { frames }
  } catch (error) {
    console.error('모션 파싱 실패:', error)
    return undefined
  }
}
