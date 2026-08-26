import { create } from 'zustand'
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

  /** Flow 통째로 복사 (id 만 새로 발급되고 나머지 값은 원본과 동일) */
  copyFlow: (id: number, customName?: string) => Promise<TaskFlow>
}

/**
 * ✅ "수정 발생 시 DRAFT로 되돌리기" 규칙:
 * - patch에 status가 명시되어 있으면 그대로 존중
 * - status가 없고, 실제 수정 patch라면 현재 상태가 DRAFT가 아닐 때 status=DRAFT 자동 추가
 *
 * ⚠️ 만약 "DRAFT로 되돌리기"도 원치 않으면 이 함수 + 호출부 제거하면 됨.
 */
// "이름 (복사본1)" 처럼 뒤에 붙은 복사본 표기를 떼어낸 원본 이름
// (괄호 없는 예전 표기 "복사본N"/"복제N" 도 같은 기준 이름으로 묶어, 복사본이 중첩되지 않게 한다)
const NAME_COPY_SUFFIX = /\s*\(?(?:복사본|복제)(\d+)\)?\s*$/

function getNameBase(name: string): string {
  return String(name ?? '')
    .trim()
    .replace(NAME_COPY_SUFFIX, '')
    .trim()
}

/**
 * 복사본 이름을 "원본이름 (복사본1)", 이미 있으면 (복사본2), (복사본3) ... 으로 만든다.
 * 원본이 이미 "이름 (복사본1)" 이라면 같은 기준 이름의 다음 번호를 이어서 쓴다.
 */
function buildCopyName(sourceName: string, existingNames: string[]): string {
  const base = getNameBase(sourceName)
  if (!base) return sourceName

  const baseKey = base.toLowerCase()
  let maxCopyNo = 0

  for (const name of existingNames) {
    const trimmed = String(name ?? '').trim()
    if (getNameBase(trimmed).toLowerCase() !== baseKey) continue

    const matched = trimmed.match(NAME_COPY_SUFFIX)
    const copyNo = matched ? Number(matched[1]) : 0
    if (Number.isFinite(copyNo) && copyNo > maxCopyNo) maxCopyNo = copyNo
  }

  return `${base} (복사본${maxCopyNo + 1})`
}

function withDraftStatusIfEdited(current: TaskFlow | undefined, patch: Partial<TaskFlow>): Partial<TaskFlow> {
  if (!patch || Object.keys(patch).length === 0) return patch
  if (patch.status != null) return patch

  const currentStatus = current?.status
  if (!currentStatus || currentStatus === TaskFlowStatus.DRAFT) return patch

  return { ...patch, status: TaskFlowStatus.DRAFT }
}

// 목록/선택 상태는 메모리 전용이다. 브라우저 저장소에 남기면 다른 세션에서 바뀐 내용이
// 오래된 캐시로 덮여 상세 화면과 캔버스가 서로 다른 플로우를 보여주게 된다.
export const useTaskFlowStore = create<TaskFlowState>()((set, get) => ({
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
        behaviorTree: '',
        isPublished:false
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

  copyFlow: async (id, customName) => {
    const source = await getTaskFlow(id)

    if (!source) {
      throw new Error('원본 Task Flow 를 불러오지 못했습니다.')
    }

    const {
      id: _originId,
      deployment: _deployment,
      deployments: _deployments,
      lastDeployment: _lastDeployment,
      taskFlowSnapshotId: _taskFlowSnapshotId,
      ...rest
    } = source as TaskFlow & Record<string, unknown>

    const requestedName = String(customName ?? '').trim()

    const name =
      requestedName ||
      buildCopyName(
        source.name,
        get().flows.map((flow) => flow.name),
      )

    const created = await createTaskFlow({
      ...rest,
      id: 0,
      name,
      version: 0,
      isPublished: false,
      createdAt: '',
      updatedAt: '',
    } as TaskFlow)

    if (!created || typeof created.id !== 'number') {
      throw new Error('복사된 Task Flow 응답이 올바르지 않습니다.')
    }

    set((state) => ({
      flows: [created, ...state.flows],
    }))

    return created
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
}))
