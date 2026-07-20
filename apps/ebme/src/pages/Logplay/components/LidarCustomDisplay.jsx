import { useMapStore } from './useMapStore'
import { useRef, useEffect } from 'react'
import { usePlayback } from '../PlaybackContext'

const MAX_POINTS = 1024
export function LidarCustomDisplay({ frameId, msgName }) {
  const geometryRef = useRef()
  const pointBufferRef = useRef(new Float32Array(MAX_POINTS * 3))
  const { paused } = usePlayback()
  useEffect(() => {
    const unsubscribe = useMapStore.subscribe(
      (state) => state.renderBuffer.displayItems[frameId]?.[msgName],
      (items) => {
        if (paused) {
          console.log('[LidarDisplay]pause status')
          return
        }
        if (!geometryRef.current || !items) return
        const pointList = pointBufferRef.current
        let filledIndex = 0
        const msg = items.data

        // console.log(
        //   '[LidarDisplay]updated frameId= ',
        //   frameId,
        //   ' msgType= ',
        //   msgName,
        //   ' ladar data update = ',
        //   msg.ranges.length
        // )

        for (var i = 0; i < msg.ranges.length; i++) {
          var r = msg.ranges[i]
          var theta = msg.angles[i]
          if (r >= msg.range_min && r <= msg.range_max) {
            pointList[filledIndex++] = r * Math.cos(theta)
            pointList[filledIndex++] = r * Math.sin(theta)
            pointList[filledIndex++] = 0.1
          }
        }
        //console.log('valid array count', filledIndex / 3)
        geometryRef.current.setDrawRange(0, filledIndex / 3)
        geometryRef.current.attributes.position.needsUpdate = true // 해당 설정만으로도 화면 갱신 진행
      },
      { fireImmediately: true } // 초기 데이터 있으면 실행
    )
    return () => unsubscribe()
  }, [paused])

  return (
    <points renderOrder={999}>
      <bufferGeometry ref={geometryRef}>
        <bufferAttribute attach="attributes-position" count={MAX_POINTS} array={pointBufferRef.current} itemSize={3} />
      </bufferGeometry>
      <pointsMaterial color="red" size={3} sizeAttenuation={false} />
    </points>
  )
}

