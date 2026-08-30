import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export const robotStore = create(
  persist(
    (set) => ({
      deviceState: 'none',
      setDeviceState: (data) => set({ deviceState: data })
    }),
    {
      name: 'robot-storage',
      partialize: (state) => ({
        deviceState: state.deviceState
      })
    }
  )
)
