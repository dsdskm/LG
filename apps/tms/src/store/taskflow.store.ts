import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { TaskFlowStatus, ReactFlowObject, TaskFlow } from '../types/taskflow'
import { ensureStartNode } from '@/utils/node.util'

// ✅ 여기만 "방금 바꾼 axiosClient 기반 API 파일" 경로로 교체
import { listTaskFlows, getTaskFlow, createTaskFlow, updateTaskFlow, deleteTaskFlow } from '@/api/taskFlowApis'

type TaskFlowState = {
  /** 목록 */
  flows: TaskFlow[]

  /** 선택된 Flow ID */
  selectedFlowId: number | null

  /** 목록 갱신 */
  refreshFlows: (groupId: string | null, siteId: string | null) => Promise<void>

  /** Flow 선택 */
  selectFlow: (id: number | null) => void

  /** 선택된 Flow 1개 갱신(서버에서 다시 가져오기) */
  refreshSelectedFlow: () => Promise<void>

  /** Flow의 이름/설명 수정 */
  updateFlowInfo: (id: number, patch: Pick<Partial<TaskFlow>, 'name' | 'description'>) => Promise<TaskFlow | null>
}

/**
 * ✅ "수정 발생 시 DRAFT로 되돌리기" 규칙:
 * - patch에 status가 명시되어 있으면 그대로 존중
 * - status가 없고, 실제 수정 patch라면 현재 상태가 DRAFT가 아닐 때 status=DRAFT 자동 추가
 *
 * ⚠️ 만약 "DRAFT로 되돌리기"도 원치 않으면 이 함수 + 호출부 제거하면 됨.
 */
function withDraftStatusIfEdited(current: TaskFlow | undefined, patch: Partial<TaskFlow>): Partial<TaskFlow> {
  if (!patch || Object.keys(patch).length === 0) return patch
  if (patch.status != null) return patch

  const currentStatus = current?.status
  if (!currentStatus || currentStatus === TaskFlowStatus.DRAFT) return patch

  return { ...patch, status: TaskFlowStatus.DRAFT }
}

export const useTaskFlowStore = create<TaskFlowState>()(
  persist(
    (set, get) => ({
      flows: [],
      selectedFlowId: null,

      refreshFlows: async (groupId: string | null, siteId: string | null) => {
        try {
          const data = await listTaskFlows(groupId, siteId)
          const flows = Array.isArray(data) ? data : []

          const prevSelected = get().selectedFlowId
          const selectedStillExists = prevSelected == null ? false : flows.some((f) => f.id === prevSelected)

          set({
            flows,
            selectedFlowId: selectedStillExists ? prevSelected : null
          })
        } catch (e) {
          console.error('[refreshFlows] failed:', e)
        }
      },

      selectFlow: (id) => {
        set({ selectedFlowId: id })
      },

      refreshSelectedFlow: async () => {
        const id = get().selectedFlowId
        if (id == null) return

        try {
          const tf = await getTaskFlow(id)
          if (!tf) return

          set((state) => ({
            flows: state.flows.map((f) => (f.id === id ? tf : f))
          }))
        } catch (e) {
          console.error('[refreshSelectedFlow] failed:', e)
        }
      },

      newFlow: async (name: string, description?: string) => {
        try {
          const trimmedName = (name ?? '').trim()
          const trimmedDescription = (description ?? '').trim()
          if (!trimmedName) return null

          const data: TaskFlow = {
            id: 0,
            siteId: '',
            name: trimmedName,
            description: trimmedDescription || undefined,
            flowDefinition: ensureStartNode({ nodes: [], edges: [] }),
            version: 0,
            status: TaskFlowStatus.DRAFT,
            createdAt: '',
            updatedAt: '',
            groupId: null,
            flowDefinitionDraft: {},
            robotSkillIds: [],
            robotSkillInfos: [],
            behaviorTree: ''
          }

          const created = await createTaskFlow(data)

          if (!created || typeof (created as any).id !== 'number') {
            console.error('[newFlow] invalid response:', created)
            return null
          }

          set((state) => ({
            flows: [created, ...state.flows],
            selectedFlowId: created.id
          }))

          return created
        } catch (e) {
          console.error('[newFlow] failed:', e)
          return null
        }
      },

      updateFlowInfo: async (id, patch) => {
        try {
          const name = patch.name?.trim()
          if (!name) return null

          const description = (patch.description ?? '').trim()
          const current = get().flows.find((f) => f.id === id)

          const basePatch: Partial<TaskFlow> = {
            name,
            description: description || undefined
          }

          const optimisticPatch = withDraftStatusIfEdited(current, basePatch)

          // 1) optimistic 반영(로컬)
          set((state) => ({
            flows: state.flows.map((f) => (f.id === id ? { ...f, ...optimisticPatch } : f))
          }))

          // 2) 서버 저장(명시적)
          const updated = await updateTaskFlow(id, optimisticPatch)

          // 3) 최신 객체로 확정
          set((state) => ({
            flows: state.flows.map((f) => (f.id === id ? updated : f))
          }))

          return updated
        } catch (e) {
          console.error('[updateFlowMeta] failed:', e)
          return null
        }
      },

      removeSelectedFlow: async () => {
        const id = get().selectedFlowId
        if (id == null) return

        try {
          await deleteTaskFlow(id)

          set((state) => ({
            flows: state.flows.filter((f) => f.id !== id),
            selectedFlowId: null
          }))
        } catch (e) {
          console.error('[removeSelectedFlow] failed:', e)
        }
      }
    }),
    {
      name: 'taskflow-ui',
      version: 1,
      partialize: (state) => ({
        flows: state.flows,
        selectedFlowId: state.selectedFlowId
      })
    }
  )
)
