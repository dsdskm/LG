import { create } from 'zustand'

export const useErrorStore = create((set, get) => ({
  error: null,
  onClose: null,
  setError: (error, onClose) => set({ error, onClose }),
  clearError: () => {
    const { onClose } = get()
    if (onClose) onClose()
    set({ error: null, onClose: null })
  }
}))

