import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { BREAKPOINTS, RESPONSIVE_MODES } from '@repo/constants'

export const useResponsiveStore = create(
  persist(
    (set) => ({
      windowWidth: typeof window !== 'undefined' && window.innerWidth,
      windowHeight: typeof window !== 'undefined' && window.innerHeight,
      responsiveMode: null,
      setWindowSize: ({ width, height }) =>
        set({
          windowWidth: width,
          windowHeight: height,
          responsiveMode:
            width > BREAKPOINTS.PC
              ? RESPONSIVE_MODES.PC
              : width > BREAKPOINTS.MOBILE
                ? RESPONSIVE_MODES.TABLET
                : RESPONSIVE_MODES.MOBILE
        })
    }),
    {
      name: 'STORE_RESPONSIVE'
    }
  )
)
