import { create } from 'zustand'

// 전제: 캔버스(FlowCanvasViewer) 인스턴스는 동시에 하나만 마운트된다.
// 이 store 는 모듈 싱글턴이라 인스턴스가 둘 이상이면 nodeId 가 겹쳐 상태가 섞인다.
// 캔버스를 여러 개 띄워야 할 때는 createStore + Context 로 인스턴스를 분리해야 한다.
// 수명 관리는 소비자 쪽 reset() 호출에 의존한다(진입/이탈, flow 변경, 모드 전환).

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
  // 등록 목록과 duration 은 유지 → 같은 flow 재생 시 길이를 다시 측정하지 않는다.
  resetAllPlayStatus: () => void
  // 등록 목록 자체를 비운다(flow 변경 / 모드 전환 / 캔버스 진입·이탈).
  reset: () => void
}

export const useContentTaskStore = create<ContentTaskState>((set, get) => ({
  tasksById: {},
  maxDuration: 0,
  addContentTask: (newTask) =>
    set((state) => {
      console.log('AddContentTask', newTask.nodeId)
      // 이미 존재하면 무시 — 등록 해제는 resetAllPlayStatus/reset 이 담당한다.
      // 여기서 덮어쓰면 측정된 duration 이 0 으로 되돌아가고, 재-run 시 길이를 다시 측정해야 한다.
      if (state.tasksById[newTask.nodeId]) return state
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
    }),

  reset: () =>
    set((state) => {
      if (Object.keys(state.tasksById).length === 0 && state.maxDuration === 0) return state
      // maxDuration 은 updateDuration 에서 Math.max 로만 커지므로 여기서 함께 되돌려야 한다.
      return { tasksById: {}, maxDuration: 0 }
    })
}))
