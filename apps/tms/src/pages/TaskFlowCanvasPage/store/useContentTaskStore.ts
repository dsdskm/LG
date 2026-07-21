import { create } from 'zustand'

export type PlayStatus = 'NONE' | 'READY' | 'PLAYING' | 'COMPLETED'

export interface ContentTask {
  nodeId: string
  playStatus: PlayStatus
}

interface ContentTaskState {
  tasksById: Record<string, ContentTask>

  addContentTask: (newTask: ContentTask) => void
  updatePlayStatus: (id: string | undefined, status: PlayStatus) => void
  getPlayStatusById: (id: string | undefined) => PlayStatus | undefined
}

export const useContentTaskStore = create<ContentTaskState>((set, get) => ({
  tasksById: {},
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

  getPlayStatusById: (id) => {
    if (!id) return 'NONE'
    return get().tasksById[id]?.playStatus ?? 'NONE'
  }
}))
