import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'

export const useCountStore = create(
  persist(
    (set) => ({
      count: 0,
      increment: () => set((state) => ({ count: state.count + 1 })),
      decrement: () => set((state) => ({ count: state.count - 1 }))
    }),
    {
      name: 'count',
      storage: createJSONStorage(() => sessionStorage)
    }
  )
)
