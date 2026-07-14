import { useCallback, useRef, useState, type ReactNode } from 'react'
import styled from 'styled-components'

const LEFT_MIN = 220
const LEFT_MAX = 520
const RIGHT_MIN = 260
const RIGHT_MAX = 720

const Grid = styled.div`
  display: grid;
  height: 100%;
  min-height: 0;
  gap: 0;
`

const Col = styled.div`
  min-width: 0;
  min-height: 0;
  display: flex;

  & > * {
    flex: 1;
    min-width: 0;
  }
`

const Resizer = styled.div`
  width: 14px;
  cursor: col-resize;
  align-self: stretch;
  display: flex;
  align-items: center;
  justify-content: center;
  touch-action: none;

  &::before {
    content: '';
    width: 3px;
    height: 44px;
    border-radius: 3px;
    background: #cbd5e1;
    transition: background 0.15s;
  }

  &:hover::before,
  &[data-active='true']::before {
    background: #64748b;
  }
`

type PanelLayoutProps = {
  left: ReactNode
  center: ReactNode
  right: ReactNode
}

export default function PanelLayout({ left, center, right }: PanelLayoutProps) {
  const [leftWidth, setLeftWidth] = useState(300)
  const [rightWidth, setRightWidth] = useState(420)
  const [activeSide, setActiveSide] = useState<'left' | 'right' | null>(null)
  const dragRef = useRef<{ side: 'left' | 'right'; startX: number; startWidth: number } | null>(null)

  const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v))

  const onPointerMove = useCallback((e: PointerEvent) => {
    const drag = dragRef.current
    if (!drag) return

    const delta = e.clientX - drag.startX
    if (drag.side === 'left') {
      setLeftWidth(clamp(drag.startWidth + delta, LEFT_MIN, LEFT_MAX))
    } else {
      // 오른쪽 패널은 핸들 오른쪽에 있으므로 왼쪽으로 드래그하면 넓어진다.
      setRightWidth(clamp(drag.startWidth - delta, RIGHT_MIN, RIGHT_MAX))
    }
  }, [])

  const onPointerUp = useCallback(() => {
    dragRef.current = null
    setActiveSide(null)
    window.removeEventListener('pointermove', onPointerMove)
    window.removeEventListener('pointerup', onPointerUp)
  }, [onPointerMove])

  const startDrag = useCallback(
    (side: 'left' | 'right') => (e: React.PointerEvent) => {
      e.preventDefault()
      dragRef.current = {
        side,
        startX: e.clientX,
        startWidth: side === 'left' ? leftWidth : rightWidth
      }
      setActiveSide(side)
      window.addEventListener('pointermove', onPointerMove)
      window.addEventListener('pointerup', onPointerUp)
    },
    [leftWidth, rightWidth, onPointerMove, onPointerUp]
  )

  return (
    <Grid
      style={{
        gridTemplateColumns: `${leftWidth}px auto minmax(0, 1fr) auto ${rightWidth}px`
      }}
    >
      <Col>{left}</Col>
      <Resizer
        onPointerDown={startDrag('left')}
        data-active={activeSide === 'left'}
        role="separator"
        aria-orientation="vertical"
      />
      <Col>{center}</Col>
      <Resizer
        onPointerDown={startDrag('right')}
        data-active={activeSide === 'right'}
        role="separator"
        aria-orientation="vertical"
      />
      <Col>{right}</Col>
    </Grid>
  )
}
