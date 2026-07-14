import { Canvas } from '@react-three/fiber'
import { useEffect, useMemo } from 'react'
import * as THREE from 'three'
import { useMapStore } from './useMapStore'

export function MapImage() {
  const renderBuffer = useMapStore((state) => state.renderBuffer)
  const { mapData } = renderBuffer

  const {
    data: originData,
    info: {
      width,
      height,
      resolution,
      origin: pose // origin을 추출해서 pose라는 이름으로 저장
    } = {}
  } = mapData

  const texture = useMemo(() => {
    console.log('[MapImage] instert map', mapData)
    if (!originData || width === 0 || height === 0) return null

    const size = width * height
    const data = new Uint8Array(4 * size)

    for (let i = 0; i < size; i++) {
      const val = originData[i]
      const stride = i * 4

      // 1. 벽 또는 장애물 (0) -> 검은색
      if (val === 254) {
        data[stride] = 0
        data[stride + 1] = 0
        data[stride + 2] = 0
        data[stride + 3] = 255
      }
      // 2. 다닐 수 있는 길
      else if (val === 1) {
        data[stride] = 255
        data[stride + 1] = 255
        data[stride + 2] = 255
        data[stride + 3] = 255
      }
      // 3. 알 수 없는 영역  -> 회색
      else {
        data[stride] = 127
        data[stride + 1] = 127
        data[stride + 2] = 127
        data[stride + 3] = 255
      }
    }

    const tex = new THREE.DataTexture(data, width, height, THREE.RGBAFormat)
    tex.magFilter = THREE.NearestFilter // 맵 경계를 선명하게 표현
    tex.flipY = true
    tex.needsUpdate = true
    return tex
  }, [originData, width, height])

  useEffect(() => {}, [texture])

  if (!texture) {
    return null
  }

  return (
    <mesh position={[pose.position.x + (width * resolution) / 2, pose.position.y + (height * resolution) / 2, 0]}>
      <planeGeometry args={[width * resolution, height * resolution]} />
      <meshBasicMaterial
        map={texture}
        transparent={true}
        side={THREE.DoubleSide} //앞뒷면 모두 보이게 설정
      />
    </mesh>
  )
}

