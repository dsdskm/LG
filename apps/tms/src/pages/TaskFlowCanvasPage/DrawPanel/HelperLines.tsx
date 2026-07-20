import { useEffect, useRef } from 'react'
import { useStore, type ReactFlowState } from '@xyflow/react'

type Props = {
  vertical?: number
  horizontal?: number
}

const selectWidth = (s: ReactFlowState) => s.width
const selectHeight = (s: ReactFlowState) => s.height
const selectTransform = (s: ReactFlowState) => s.transform

/**
 * 드래그 중 정렬 보조선 렌더러.
 * vertical/horizontal 은 flow 좌표이며, viewport transform([x,y,zoom])으로 화면 좌표로 변환해 그린다.
 * (canvas 오버레이, 클릭 통과)
 */
export default function HelperLines({ vertical, horizontal }: Props) {
  const width = useStore(selectWidth)
  const height = useStore(selectHeight)
  const transform = useStore(selectTransform)
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    const ctx = canvas?.getContext('2d')
    if (!canvas || !ctx) return

    const dpi = window.devicePixelRatio || 1
    canvas.width = width * dpi
    canvas.height = height * dpi
    ctx.scale(dpi, dpi)
    ctx.clearRect(0, 0, width, height)

    ctx.strokeStyle = '#ef4444'
    ctx.lineWidth = 1

    const [tx, ty, zoom] = transform

    if (typeof vertical === 'number') {
      const x = vertical * zoom + tx
      ctx.beginPath()
      ctx.moveTo(x, 0)
      ctx.lineTo(x, height)
      ctx.stroke()
    }

    if (typeof horizontal === 'number') {
      const y = horizontal * zoom + ty
      ctx.beginPath()
      ctx.moveTo(0, y)
      ctx.lineTo(width, y)
      ctx.stroke()
    }
  }, [width, height, transform, vertical, horizontal])

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width,
        height,
        pointerEvents: 'none',
        zIndex: 10
      }}
    />
  )
}
