import { create } from 'zustand'

const initialMessages = [
  {
    id: 'assistant-welcome',
    role: 'assistant',
    content: '현재 화면을 기준으로 궁금한 내용을 편하게 질문해 주세요. 모든 질문에는 현재 페이지 정보가 함께 전달되어 더 정확하게 답변해드립니다.',
    createdAt: new Date().toISOString(),
    context: null
  }
]

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
  resetMessages: () => set({ messages: initialMessages })
}))
