import { create } from 'zustand'

export type PlayStatus = 'NONE' | 'READY' | 'PLAYING' | 'COMPLETED' | 'FAILURE'

export interface ContentTask {
  nodeId: string
  playStatus: PlayStatus
  current: number
  duration: number
}

interface ContentTaskState {
  tasksById: Record<string, ContentTask>
  maxDuration: number

  addContentTask: (newTask: ContentTask) => void
  updatePlayStatus: (id: string | undefined, status: PlayStatus) => void
  updateDuration: (id: string | undefined, duration: number) => void
  updateCurrent: (id: string | undefined, current: number) => void
  getPlayStatusById: (id: string | undefined) => PlayStatus | undefined
  // 등록된 모든 콘텐츠 task 의 재생 상태를 READY 로 되돌린다(재-run 시 처음부터 다시 재생/평가).
  resetAllPlayStatus: () => void
}

export const useContentTaskStore = create<ContentTaskState>((set, get) => ({
  tasksById: {},
  maxDuration: 0,
  addContentTask: (newTask) =>
    set((state) => {
      if (state.tasksById[newTask.nodeId]) return state // 이미 존재하면 무시
      return {
        tasksById: {
          ...state.tasksById,
          [newTask.nodeId]: newTask
        }
      }
    }),

  updatePlayStatus: (id, status) =>
    set((state) => {
      if (!id) return state
      if (!state.tasksById[id]) return state // 없는 ID면 무시
      if (state.tasksById[id].playStatus === status) return state
      return {
        tasksById: {
          ...state.tasksById,
          [id]: { ...state.tasksById[id], playStatus: status }
        }
      }
    }),

  updateDuration: (id, duration) =>
    set((state) => {
      if (!id) return state
      if (!state.tasksById[id]) return state // 없는 ID면 무시
      if (state.tasksById[id].duration === duration) return state
      return {
        tasksById: {
          ...state.tasksById,
          [id]: { ...state.tasksById[id], duration: duration }
        },
        maxDuration: Math.max(state.maxDuration, duration)
      }
    }),

  updateCurrent: (id, current) =>
    set((state) => {
      if (!id) return state
      if (!state.tasksById[id]) return state // 없는 ID면 무시
      if (state.tasksById[id].current === current) return state
      return {
        tasksById: {
          ...state.tasksById,
          [id]: { ...state.tasksById[id], current: current }
        }
      }
    }),

  getPlayStatusById: (id) => {
    if (!id) return 'NONE'
    return get().tasksById[id]?.playStatus ?? 'NONE'
  },

  resetAllPlayStatus: () =>
    set((state) => {
      const entries = Object.entries(state.tasksById)
      if (entries.length === 0) return state
      const next: Record<string, ContentTask> = {}
      for (const [id, task] of entries) {
        next[id] = task.playStatus === 'READY' ? task : { ...task, playStatus: 'READY' }
      }
      return { tasksById: next }
    })
}))
