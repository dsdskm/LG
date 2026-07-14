import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export const useSideBarStore = create(
  persist(
    (set) => ({
      compactSideBar: typeof window !== 'undefined' && window.innerWidth <= 767,
      openDepth: null,
      toggleSideBar: () =>
        set(({ compactSideBar }) => ({
          compactSideBar: !compactSideBar,
          openDepth: compactSideBar && null
        })),
      // setOpenDepth: (prefix) => set(({ openDepth }) => ({ openDepth: openDepth === prefix ? null : prefix })),
      setOpenDepth: (prefix) => set({ openDepth: prefix }),
      setCompactSideBar: (value) => set({ compactSideBar: value })
    }),
    {
      name: 'STORE_SIDEBAR'
    }
  )
)
