import { useMemo } from 'react'
import * as THREE from 'three'
import { Line } from '@react-three/drei'
import { useMapStore } from './useMapStore'

export function PathDisplay({ frameId, msgName }) {
  const pathMsg = useMapStore((state) => state.renderBuffer.displayItems[frameId]?.[msgName])
  const { data } = pathMsg
  //console.log('pathMsg data', data)
  const points = useMemo(() => {
    if (!data || !data.poses || data.poses.length < 2) {
      return [new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, 0, 0)]
    }

    return data.poses.map((p) => {
      const pos = p.pose.position
      return new THREE.Vector3(pos.x, pos.y, pos.z + 0.1)
    })
  }, [data])

  return (
    <mesh>
      <Line points={points} color={'#00ff00'} lineWidth={5} />
    </mesh>
  )
}

