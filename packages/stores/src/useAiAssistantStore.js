import { create } from 'zustand'
import { persist } from 'zustand/middleware'

const initialMessages = []

export const useAiAssistantStore = create(
  persist(
    (set) => ({
      isOpen: false,
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
      replaceMessages: (newMessages) =>
        set({ messages: Array.isArray(newMessages) ? newMessages : initialMessages }),
      prependMessages: (newMessages) =>
        set(({ messages }) => ({
          messages: [...(Array.isArray(newMessages) ? newMessages : []), ...messages]
        })),
      resetMessages: () => set({ messages: initialMessages })
    }),
    {
      name: 'ai-assistant-state',
      partialize: (state) => ({
        isOpen: state.isOpen
      })
    }
  )
)
