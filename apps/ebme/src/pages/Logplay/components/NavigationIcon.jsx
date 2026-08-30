import { useTexture } from '@react-three/drei'
import { useEffect, useRef } from 'react'
import { useMapStore } from './useMapStore'
import { usePlayback } from '../PlaybackContext'

export function NavigationIcon({ frameId, msgName }) {
  const texture = useTexture('/ebme/navigation.png')
  const meshRef = useRef()
  const { paused } = usePlayback()

  useEffect(() => {
    const unSubscribe = useMapStore.subscribe(
      (state) => state.renderBuffer.displayItems[frameId]?.[msgName],
      (pose) => {
        //console.log('[NavigationIcon]pose == ', pose)
        if (meshRef.current && pose && !paused) {
          const { x, y, theta } = pose.data.pose
          // meshRef.current.position.set(position.x, position.y, position.z + 0.1)
          // meshRef.current.quaternion.set(orientation.x, orientation.y, orientation.z, orientation.w)
          meshRef.current.position.set(x, y, 0.2)
          //meshRef.current.rotation.z = theta
          meshRef.current.rotation.z = -theta - Math.PI / 2
        }
      },
      { fireImmediately: true }
    )
    return () => unSubscribe()
  }, [paused])

  return (
    <mesh ref={meshRef}>
      <planeGeometry args={[0.5, 0.5]} />
      <meshBasicMaterial map={texture} transparent={true} alphaTest={0.5} />
    </mesh>
  )
}

