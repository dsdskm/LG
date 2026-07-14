import { create } from 'zustand'
import { persist } from 'zustand/middleware'

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
          responsiveMode: width > 767 ? 'PC' : 'MOBILE'
        })
    }),
    {
      name: 'STORE_RESPONSIVE'
    }
  )
)
