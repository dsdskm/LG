import { useRef, useEffect, useMemo } from 'react'
import { useMapStore } from './useMapStore'
import { Line } from '@react-three/drei'
import { usePlayback } from '../PlaybackContext'

export function DynamicRobotPath({ frameId, maxPoints = 1000, msgName }) {
  const lineRef = useRef()
  const pointsBuffer = useMemo(() => new Float32Array(maxPoints * 3), [maxPoints])
  const countRef = useRef(0)
  const pausedCountRef = useRef(0)
  const { paused } = usePlayback()

  useEffect(() => {
    if (paused) {
      pausedCountRef.current = countRef.current
    }
  }, [paused])

  useEffect(() => {
    const unsubscribe = useMapStore.subscribe(
      (state) => state.renderBuffer.displayItems[frameId]?.[msgName],
      (currentPose) => {
        if (!currentPose || !lineRef.current) return
        const { x, y } = currentPose.data.pose

        if (countRef.current > 0) {
          const lastIdx = (countRef.current - 1) * 3
          const dx = pointsBuffer[lastIdx] - x
          const dy = pointsBuffer[lastIdx + 1] - y
          if (Math.sqrt(dx * dx + dy * dy) < 0.03) {
            console.log('[DynamicRobotPath]skip add')
            return
          } else {
            console.log('[DynamicRobotPath]add ', currentPose.data.pose)
          }

          console.log('[DynamicRobotPath]index = ', countRef.current)
        }

        if (countRef.current < maxPoints) {
          const idx = countRef.current * 3
          pointsBuffer[idx] = x
          pointsBuffer[idx + 1] = y
          pointsBuffer[idx + 2] = 0.1
          countRef.current++
        } else {
          // 버퍼가 꽉 찼을 때: 'Shift' 효과 구현
          // index 3부터 끝까지의 데이터를 index 0 위치로 복사 (좌표 1개 분량인 3칸을 앞으로 당김)
          pointsBuffer.set(pointsBuffer.subarray(3))

          const lastIdx = (maxPoints - 1) * 3
          pointsBuffer[lastIdx] = x
          pointsBuffer[lastIdx + 1] = y
          pointsBuffer[lastIdx + 2] = 0.1
          pausedCountRef.current -= 1
          pausedCountRef.current = pausedCountRef.current < 1 ? 0 : pausedCountRef.current
        }

        const line = lineRef.current
        const geo = line.geometry

        if (paused) {
          geo.setPositions(pointsBuffer.subarray(0, pausedCountRef.current * 3))
        } else {
          geo.setPositions(pointsBuffer.subarray(0, countRef.current * 3))
        }

        // [중요] 인스턴싱 기반의 Line은 포인트 개수가 늘어날 때
        // 아래의 내부 프로퍼티를 삭제해야 전체 선이 다 그려집니다.
        delete geo._maxInstanceCount

        geo.computeBoundingSphere()
        line.computeLineDistances()
      }
    )
    return () => unsubscribe()
  }, [frameId, msgName, maxPoints, paused])

  return (
    <Line
      ref={lineRef}
      // 최소 2개의 포인트가 있어야 초기 버퍼가 생성됩니다.
      points={[
        [0, 0, 0.1],
        [0.001, 0.001, 0.1]
      ]}
      color="#0000cc"
      lineWidth={5} // 두께를 살짝 키워 확인해 보세요.
      transparent
      opacity={0.8}
    />
  )
}

