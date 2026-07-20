import { create } from 'zustand'
import { persist } from 'zustand/middleware'

// 런타임 스타일 테마: 'new'(현재 스타일) | 'legacy'(기존 스타일)
// <html data-theme="..."> 속성으로 CSS 변수(--t-*)를 전환한다.
const applyTheme = (theme) => {
  if (typeof document === 'undefined') return
  if (theme === 'legacy') {
    document.documentElement.setAttribute('data-theme', 'legacy')
  } else {
    document.documentElement.removeAttribute('data-theme')
  }
}

export const useThemeStore = create(
  persist(
    (set, get) => ({
      theme: 'new',
      setTheme: (theme) => {
        applyTheme(theme)
        set({ theme })
      },
      toggleTheme: () => {
        const next = get().theme === 'new' ? 'legacy' : 'new'
        applyTheme(next)
        set({ theme: next })
      }
    }),
    {
      name: 'ui-theme',
      getStorage: () => localStorage,
      onRehydrateStorage: () => (state) => {
        applyTheme(state?.theme ?? 'new')
      }
    }
  )
)
