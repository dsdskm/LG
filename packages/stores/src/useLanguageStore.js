import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export const useLanguageStore = create(
  persist(
    (set) => ({
      currentLanguage: 'ko-KR',
      setCurrentLanguage: (key) => set({ currentLanguage: key })
    }),
    {
      name: 'STORE_LANGUAGE'
    }
  )
)
