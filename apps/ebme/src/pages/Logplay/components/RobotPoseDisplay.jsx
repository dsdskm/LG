import { DynamicRobotPath } from './DynamicRobotPath'
import { NavigationIcon } from './NavigationIcon'
import { Suspense } from 'react'

export function RobotPoseDisplay({ frameId, msgName }) {
  console.log('RobotPoseDisplay')
  return (
    <group>
      <Suspense fallback={null}>
        <NavigationIcon frameId={frameId} msgName={msgName} />
      </Suspense>
      <DynamicRobotPath frameId={frameId} maxPoints={2000} msgName={msgName} />
    </group>
  )
}

