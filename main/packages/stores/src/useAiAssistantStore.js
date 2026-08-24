import { create } from 'zustand'

const initialMessages = []

export const useAiAssistantStore = create((set) => ({
  isOpen: true,
  messages: initialMessages,
  openPanel: () => set({ isOpen: true }),
  closePanel: () => set({ isOpen: false }),
  togglePanel: () => set(({ isOpen }) => ({ isOpen: !isOpen })),
  appendMessage: (message) =>
    set(({ messages }) => ({
      messages: [...messages, message]
    })),
  updateMessageById: (id, patch) =>
    set(({ messages }) => ({
      messages: messages.map((message) =>
        String(message?.id ?? '') === String(id ?? '')
          ? {
              ...message,
              ...(patch && typeof patch === 'object' ? patch : {})
            }
          : message
      )
    })),
  resetMessages: () => set({ messages: initialMessages })
}))
