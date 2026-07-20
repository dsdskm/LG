import { Suspense, useMemo, useRef } from 'react'
import { Canvas, useFrame, useLoader } from '@react-three/fiber'
import { Center, OrbitControls } from '@react-three/drei'
import URDFLoader, { URDFRobot } from 'urdf-loader'
import { PreviewCard } from './styles.preview'
import { PreviewProps } from './types.preview'
import { parseMotionYaml } from '@/utils/motionParser'
import { MotionData, ParsedTrajectory, TrajectoryPoint } from '@/types/motion'
const URDF_BASE = '/tms/urdf/cloid_description_1k'

const motion_yaml = `
# FollowJointTrajectory action goal for aging.py motions
# Based on aging.py sequence: 18 joints (4 waist + 7 left + 7 right)
 
trajectory:
  joint_names:
    - waist_joint_1
    - waist_joint_2
    - waist_joint_3
    - waist_joint_4
    - left_joint_1
    - left_joint_2
    - left_joint_3
    - left_joint_4
    - left_joint_5
    - left_joint_6
    - left_joint_7
    - right_joint_1
    - right_joint_2
    - right_joint_3
    - right_joint_4
    - right_joint_5
    - right_joint_6
    - right_joint_7
 
  points:
    # Initial pose (0-1s)
    - positions: [0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0]
      time_from_start: {sec: 1, nanosec: 0}
 
    # Initial pose (1-10s)
    - positions: [0.0, 0.436332, -0.436332, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0]
      time_from_start: {sec: 10, nanosec: 0}
 
    # Posture 1 (10-15s)
    - positions: [0.0, 0.436332, -0.436332, 0.0, 3.124139, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 3.124139, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0]
      time_from_start: {sec: 15, nanosec: 0}
 
    # Posture 2 (15-20s)
    - positions: [0.0, 0.436332, -0.436332, 0.0, 1.570796, 0.0, 0.0, 2.094395, 0.0, 0.0, 0.0, 1.570796, 0.0, 0.0, 2.094395, 0.0, 0.0, 0.0]
      time_from_start: {sec: 20, nanosec: 0}
 
    # Posture 3 (20-25s)
    - positions: [0.0, 0.436332, -0.436332, 0.0, 1.570796, 1.570796, 0.0, 1.570796, 0.0, 0.0, 0.0, 1.570796, 1.570796, 0.0, 1.570796, 0.0, 0.0, 0.0]
      time_from_start: {sec: 25, nanosec: 0}
 
    # Posture 4 (25-30s)
    - positions: [0.0, 0.436332, -0.436332, 0.0, 1.570796, 1.570796, 1.570796, 1.570796, 1.570796, 1.221730, 0.0, 1.570796, 1.570796, 1.570796, 1.570796, 1.570796, 1.221730, 0.0]
      time_from_start: {sec: 30, nanosec: 0}
 
    # Posture 5 (30-35s)
    - positions: [0.0, 0.436332, -0.436332, 0.0, 1.570796, 1.570796, 1.570796, 1.570796, 1.570796, 0.0, 1.221730, 1.570796, 1.570796, 1.570796, 1.570796, 1.570796, 0.0, 1.221730]
      time_from_start: {sec: 35, nanosec: 0}
 
    # Posture 6 (35-40s)
    - positions: [0.0, 0.436332, -0.436332, 0.0, 1.570796, 1.570796, -1.570796, 1.570796, -1.570796, -1.221730, 0.0, 1.570796, 1.570796, -1.570796, 1.570796, -1.570796, -1.221730, 0.0]
      time_from_start: {sec: 40, nanosec: 0}
 
    # Posture 7 (40-45s)
    - positions: [0.0, 0.436332, -0.436332, 0.0, 1.570796, 1.570796, -1.570796, 1.570796, -1.570796, 0.0, -1.221730, 1.570796, 1.570796, -1.570796, 1.570796, -1.570796, 0.0, -1.221730]
      time_from_start: {sec: 45, nanosec: 0}
 
    # Posture 8 (45-50s)
    - positions: [0.0, 0.436332, -0.436332, 0.0, 1.570796, 1.570796, 0.0, 1.570796, 0.0, 0.0, 0.0, 1.570796, 1.570796, 0.0, 1.570796, 0.0, 0.0, 0.0]
      time_from_start: {sec: 50, nanosec: 0}
 
    # Posture 9 (50-55s)
    - positions: [0.0, 0.436332, -0.436332, 0.0, 1.570796, 0.0, 0.0, 2.094395, 0.0, 0.0, 0.0, 1.570796, 0.0, 0.0, 2.094395, 0.0, 0.0, 0.0]
      time_from_start: {sec: 55, nanosec: 0}
 
    # Initial pose (55-60s)
    - positions: [0.0, 0.436332, -0.436332, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0]
      time_from_start: {sec: 60, nanosec: 0}
 
path_tolerance: []
goal_tolerance: []
goal_time_tolerance: {sec: 1, nanosec: 0}

`

function useUrdfRobot(url: string) {
  const LoaderClass = URDFLoader as any as new (...args: any[]) => any
  return useLoader(LoaderClass, url, (loader) => {
    loader.packages = { cloid_description: URDF_BASE }
  })
}

interface RobotProps {
  urdfUrl: string
  motionData: MotionData | null
}

// YAML(aging.py)의 관절 이름을 URDF 실제 관절 이름으로 매핑
// 예) left_joint_1 -> left_arm_joint_1, right_joint_1 -> right_arm_joint_1
function resolveJointName(name: string): string {
  return name.replace(/^left_joint_/, 'left_arm_joint_').replace(/^right_joint_/, 'right_arm_joint_')
}
function sampleFrame(frames: MotionData['frames'], t: number): Record<string, number> {
  // 가장 단순한 버전: 매번 처음부터 찾음 (최적화 없음)
  let i = 0
  while (i < frames.length - 1 && frames[i + 1].t < t) i++
  const a = frames[i]
  const b = frames[Math.min(i + 1, frames.length - 1)]
  if (a === b) return a.joints

  const alpha = (t - a.t) / (b.t - a.t)
  const joints: Record<string, number> = {}
  for (const name in a.joints) {
    joints[name] = a.joints[name] * (1 - alpha) + b.joints[name] * alpha
  }
  return joints
}

function Robot({ urdfUrl, motionData }: RobotProps) {
  const robot = useUrdfRobot(urdfUrl)
  const robotRef = useRef<URDFRobot>(null!)
  const timeRef = useRef(0)

  const duration = motionData?.frames[motionData?.frames.length - 1].t ?? 1

  useFrame((_, delta) => {
    //console.log('delta', delta)
    timeRef.current = timeRef.current + delta
    const joints = sampleFrame(motionData?.frames ?? [], timeRef.current)
    Object.entries(joints).forEach(([key, value]) => {
      // 로봇의 joints 맵에서 관절을 찾아 값을 주입합니다.
      robotRef.current?.joints[resolveJointName(key)]?.setJointValue(value)
    })
  })

  return <primitive ref={robotRef} object={robot} />
}

export default function MotionPreview({ node }: PreviewProps) {
  const motion = useMemo(() => parseMotionYaml(motion_yaml), [])
  console.log('motion data', motion)
  if (!node || !node.data) {
    return <></>
  }

  return (
    <PreviewCard>
      <Canvas camera={{ position: [0, 0, 5], fov: 25, zoom: 1.25 }}>
        <ambientLight intensity={0.5} />
        <directionalLight position={[3, 3, 3]} />
        <Suspense fallback={null}>
          <Center>
            <group rotation={[-Math.PI / 2, 0, -Math.PI / 2]}>
              <Robot urdfUrl={`${URDF_BASE}/model/cloid_v1_hand.urdf`} motionData={motion} />
            </group>
          </Center>
        </Suspense>
        <OrbitControls target={[0, 0, 0]} />
      </Canvas>
    </PreviewCard>
  )
}
