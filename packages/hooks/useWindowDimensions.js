import { throttle } from 'lodash'
import { useCallback, useEffect, useState } from 'react'
import { useResponsiveStore, useSideBarStore } from '@repo/stores'
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
        const newMode = realWidth > 767 ? 'PC' : 'MOBILE'

        useResponsiveStore.getState().setWindowSize({ width: realWidth, height: realHeight })

        if (currentMode !== newMode) {
          useSideBarStore.getState().setCompactSideBar(realWidth <= 767)
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
