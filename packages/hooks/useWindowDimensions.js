import { throttle } from 'lodash'
import { useCallback, useEffect, useState } from 'react'
import { useResponsiveStore, useSideBarStore } from '@repo/stores'
import { BREAKPOINTS, RESPONSIVE_MODES } from '@repo/constants'
import '../ui/styles/vars.css'

export const useWindowDimensions = () => {
  const hasWindow = typeof window !== 'undefined'

  const getWindowDimensions = useCallback(() => {
    const width = hasWindow ? window?.innerWidth * 0.01 : null
    const height = hasWindow ? window?.innerHeight * 0.01 : null
    return {
      width,
      height
    }
  }, [hasWindow])

  const [windowDimensions, setWindowDimensions] = useState(() => getWindowDimensions())

  useEffect(() => {
    if (hasWindow && windowDimensions.width !== null) {
      document.documentElement.style.setProperty('--viewport-width', `${windowDimensions.width}px`)
      document.documentElement.style.setProperty('--viewport-height', `${windowDimensions.height}px`)
    }
  }, [hasWindow, windowDimensions])

  useEffect(() => {
    if (hasWindow) {
      const syncStore = () => {
        const realWidth = window.innerWidth
        const realHeight = window.innerHeight
        const currentMode = useResponsiveStore.getState().responsiveMode
        const newMode =
          realWidth > BREAKPOINTS.PC
            ? RESPONSIVE_MODES.PC
            : realWidth > BREAKPOINTS.MOBILE
              ? RESPONSIVE_MODES.TABLET
              : RESPONSIVE_MODES.MOBILE

        useResponsiveStore.getState().setWindowSize({ width: realWidth, height: realHeight })

        if (currentMode !== newMode) {
          useSideBarStore.getState().setCompactSideBar(newMode !== RESPONSIVE_MODES.PC)
        }
      }

      syncStore()

      const handleResize = throttle(() => {
        const newDimensions = getWindowDimensions()
        setWindowDimensions((prev) => {
          if (prev.width === newDimensions.width && prev.height === newDimensions.height) {
            return prev
          }
          return newDimensions
        })
        syncStore()
      }, 100)

      window?.addEventListener('resize', handleResize)
      return () => window?.removeEventListener('resize', handleResize)
    }
    return () => {}
  }, [hasWindow, getWindowDimensions])

  return windowDimensions
}
