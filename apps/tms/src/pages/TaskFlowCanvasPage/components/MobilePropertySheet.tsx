import { useEffect, useMemo, useState } from 'react'
import { Drawer } from 'vaul'
import { SheetBody, SheetHandle, SheetTitle, StyledContent, StyledOverlay } from '../FlowCanvasViewer/styles'

export function MobilePropertySheet({
  isOpen,
  onClose,
  children
}: {
  isOpen: boolean
  onClose: () => void
  children: React.ReactNode
}) {
  const snapPoints = useMemo(() => ['80px', '355px', 1], [])
  const [snap, setSnap] = useState<number | string | null>(snapPoints[1])

  useEffect(() => {
    if (!isOpen) return
    document.body.style.pointerEvents = 'auto'
    const raf = requestAnimationFrame(() => {
      document.body.style.pointerEvents = 'auto'
    })
    return () => cancelAnimationFrame(raf)
  }, [isOpen])

  return (
    <Drawer.Root
      snapPoints={snapPoints}
      activeSnapPoint={snap}
      setActiveSnapPoint={setSnap}
      open={isOpen}
      onOpenChange={(open) => !open && onClose()}
      modal={false}
      dismissible={false}
    >
      <Drawer.Portal>
        <StyledOverlay />
        <StyledContent>
          <SheetHandle />
          <SheetBody>{children}</SheetBody>
        </StyledContent>
      </Drawer.Portal>
    </Drawer.Root>
  )
}
