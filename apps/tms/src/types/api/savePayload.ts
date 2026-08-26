import { TaskFlowStatus, TaskFlow } from '@/types/taskflow'

/**
 * 저장 대상
 *  - 'saved' : flowDefinitionDraft(저장 버전) 만 갱신
 *  - 'both'  : flowDefinitionDraft + flowDefinition(최종 버전) 동시 갱신
 *
 * 저장 버전은 어떤 경우에도 항상 갱신된다. (최종 버전만 따로 갱신하는 저장은 없다)
 */
export type SaveMode = 'saved' | 'both'
type FlowMode = 'default' | 'tree'

type ViewportLike =
  | {
    x?: number
    y?: number
    zoom?: number
  }
  | [number, number, number]
  | null
  | undefined

type BuildTaskFlowPersistPayloadParams = {
  mode: SaveMode
  flowId?: number | null
  baseFlow?: TaskFlow | null
  flowName: string
  flowDescription?: string
  nodes: any[]
  edges: any[]
  canvasNotes?: any[]
  viewport?: ViewportLike
  flowMode: FlowMode
  behaviorTree?: string
  groupId?: string | null
  siteId?: string | null
}

const DEFAULT_VIEWPORT = {
  x: 0,
  y: 0,
  zoom: 1
}

// 아직 값이 없는 쪽(flowDefinition / flowDefinitionDraft)에 넣는 값
const EMPTY_FLOW_DEFINITION = {}

// 최종 버전(flowDefinition)을 갱신하는 저장인지
function writesFinal(mode: SaveMode) {
  return mode === 'both'
}

function normalizeOrgId(value: any) {
  if (value == null) return null
  return String(value).trim()
}

function normalizeFlowMode(value: any): FlowMode {
  return value === 'tree' ? 'tree' : 'default'
}

function normalizeViewport(viewport?: ViewportLike, fallback?: { x?: number; y?: number; zoom?: number } | null) {
  if (Array.isArray(viewport)) {
    return {
      x: Number(viewport[0] ?? fallback?.x ?? DEFAULT_VIEWPORT.x),
      y: Number(viewport[1] ?? fallback?.y ?? DEFAULT_VIEWPORT.y),
      zoom: Number(viewport[2] ?? fallback?.zoom ?? DEFAULT_VIEWPORT.zoom)
    }
  }

  if (viewport && typeof viewport === 'object') {
    return {
      x: Number(viewport.x ?? fallback?.x ?? DEFAULT_VIEWPORT.x),
      y: Number(viewport.y ?? fallback?.y ?? DEFAULT_VIEWPORT.y),
      zoom: Number(viewport.zoom ?? fallback?.zoom ?? DEFAULT_VIEWPORT.zoom)
    }
  }

  return {
    x: Number(fallback?.x ?? DEFAULT_VIEWPORT.x),
    y: Number(fallback?.y ?? DEFAULT_VIEWPORT.y),
    zoom: Number(fallback?.zoom ?? DEFAULT_VIEWPORT.zoom)
  }
}

function normalizeNode(node: any) {
  return {
    id: node?.id,
    type: node?.type,
    position: {
      x: node?.position?.x ?? 0,
      y: node?.position?.y ?? 0
    },
    data: node?.data ?? {},
    measured: node?.measured
      ? {
        width: node.measured.width,
        height: node.measured.height
      }
      : undefined,
    selected: !!node?.selected,
    dragging: !!node?.dragging,
    draggable: node?.draggable ?? true,
    selectable: node?.selectable ?? true,
    deletable: node?.deletable ?? true,
    connectable: node?.connectable ?? true
  }
}

function normalizeEdge(edge: any) {
  return {
    id: edge?.id,
    source: edge?.source,
    target: edge?.target,
    sourceHandle: edge?.sourceHandle ?? null,
    targetHandle: edge?.targetHandle ?? null,
    type: edge?.type ?? 'default',
    markerEnd: edge?.markerEnd ?? undefined,
    style: edge?.style ?? undefined,
    data: edge?.data ?? undefined
  }
}

function normalizeCanvasNote(note: any) {
  return {
    id: note?.id,
    x: Number(note?.x ?? 0),
    y: Number(note?.y ?? 0),
    title: String(note?.title ?? '메모'),
    text: String(note?.text ?? ''),
    width: Number(note?.width ?? 240),
    height: Number(note?.height ?? 150),
    color: String(note?.color ?? '#fef3c7')
  }
}

function dedupeById<T extends { id: number | string }>(items: T[]) {
  const map = new Map<string, T>()

  items.forEach((item) => {
    map.set(String(item.id), item)
  })

  return Array.from(map.values())
}

function buildTasksFromNodes(nodes: any[]) {
  const tasks = nodes
    .map((node) => {
      const data = node?.data
      if (!data?.taskId) return null

      return {
        id: data.taskId,
        siteId: null,
        taskType: data.taskType,
        name: data.taskName,
        propertySchema: data.propertySchema,
        minExecVer: '1.0.0',
        version: '1.0.0',
        description: data.description ?? null,
        isDeployable: true,
        status: 'ACTIVE',
        createdAt: '',
        updatedAt: ''
      }
    })
    .filter(Boolean)

  return dedupeById(tasks as any[])
}

function buildContentsFromNodes(nodes: any[]) {
  const contents = nodes
    .map((node) => {
      const data = node?.data
      if (!data?.contentId) return null

      return {
        id: data.contentId,
        contentTypeId: Number(data.contentTypeId ?? 0),
        contentTypeName: data.contentTypeName ?? '',
        contentValue: data.contentValue ?? '',
        createdAt: '',
        groupId: data.groupId ?? '',
        name: data.contentName,
        siteId: data.siteId ?? null,
        status: 'ACTIVE',
        updatedAt: '',
        version: data.contentVersion ?? ''
      }
    })
    .filter(Boolean)

  return dedupeById(contents as any[])
}

function getSnapshotStatus(mode: SaveMode) {
  return writesFinal(mode) ? TaskFlowStatus.ACTIVE : TaskFlowStatus.DRAFT
}

function getBaseViewport(baseFlow: any) {
  return (
    baseFlow?.flowDefinitionDraft?.viewport ??
    baseFlow?.flowDefinition?.viewport ??
    baseFlow?.viewport ??
    DEFAULT_VIEWPORT
  )
}

function getBaseFlowMode(baseFlow: any): FlowMode {
  return normalizeFlowMode(
    baseFlow?.flowDefinitionDraft?.flowMode ?? baseFlow?.flowDefinition?.flowMode ?? baseFlow?.flowMode
  )
}

// 최종 버전 저장 시, BT XML 뿐 아니라 전체 taskflow snapshot이 실제로 변경된 경우에만 버전을 올린다.
function normalizeComparableSnapshot(value: any) {
  if (value == null) return null

  if (typeof value === 'string') return value.trim()

  if (Array.isArray(value)) {
    return value.map((item) => normalizeComparableSnapshot(item))
  }

  if (typeof value === 'object') {
    return Object.keys(value)
      .sort()
      .reduce((acc, key) => {
        if (key === 'version' || key === 'name' || key === 'description') return acc
        const child = value[key]
        acc[key] = normalizeComparableSnapshot(child)
        return acc
      }, {} as Record<string, any>)
  }

  return value
}

function hasMeaningfulTaskFlowChange(baseFlow: any, snapshot: any) {
  const prevSnapshot = normalizeComparableSnapshot(baseFlow?.flowDefinition ?? baseFlow ?? null)
  const nextSnapshot = normalizeComparableSnapshot(snapshot)
  return JSON.stringify(prevSnapshot) !== JSON.stringify(nextSnapshot)
}

function resolveVersion(mode: SaveMode, baseFlow: any, snapshot: any): number {
  const baseVersion = baseFlow?.version ?? 0

  // 최종 버전을 갱신하지 않는 저장은 버전을 유지한다.
  if (!writesFinal(mode)) return baseVersion

  // 최초 저장 시 이전 snapshot이 없거나 비어 있으면 그대로 유지한다.
  if (!baseFlow) return baseVersion

  const changed = hasMeaningfulTaskFlowChange(baseFlow, snapshot)
  return changed ? baseVersion + 1 : baseVersion
}

export function buildTaskFlowPersistPayload({
  mode,
  flowId,
  baseFlow,
  flowName,
  flowDescription,
  nodes,
  edges,
  canvasNotes = [],
  viewport,
  flowMode,
  behaviorTree,
  groupId,
  siteId
}: BuildTaskFlowPersistPayloadParams) {
  const normalizedNodes = nodes.map(normalizeNode)
  const normalizedEdges = edges.map(normalizeEdge)
  const normalizedCanvasNotes = canvasNotes.map(normalizeCanvasNote)
  const tasks = buildTasksFromNodes(normalizedNodes)
  const contents = buildContentsFromNodes(normalizedNodes)

  const resolvedViewport = normalizeViewport(viewport, getBaseViewport(baseFlow))
  const resolvedFlowMode = normalizeFlowMode(flowMode ?? getBaseFlowMode(baseFlow))
  const resolvedGroupId = normalizeOrgId(groupId) ?? normalizeOrgId(baseFlow?.groupId)
  const resolvedSiteId = normalizeOrgId(siteId) ?? normalizeOrgId(baseFlow?.siteId)
  const resolvedStatus = getSnapshotStatus(mode)

  const snapshot = {
    id: flowId ?? baseFlow?.id ?? 0,
    name: flowName,
    groupId: resolvedGroupId,
    siteId: resolvedSiteId,
    status: resolvedStatus,
    version: baseFlow?.version ?? 0,
    createdAt: baseFlow?.createdAt ?? '',
    updatedAt: baseFlow?.updatedAt ?? '',
    description: flowDescription || '',
    tasks,
    contents,
    nodes: normalizedNodes,
    edges: normalizedEdges,
    canvasNotes: normalizedCanvasNotes,
    viewport: resolvedViewport,
    flowMode: resolvedFlowMode,
    behaviorTree: behaviorTree?.trim() || ' '
  }
  const resolvedVersion = resolveVersion(mode, baseFlow, snapshot)
  const persistedSnapshot = {
    ...snapshot,
    status: resolvedStatus,
    version: resolvedVersion
  }

  // 갱신하지 않는 쪽(최종 버전)은 기존 값을 그대로 되돌려 보내 보존한다.
  const isFinal = writesFinal(mode)
  const previousFinal = baseFlow?.flowDefinition ?? EMPTY_FLOW_DEFINITION

  return {
    id: flowId ?? baseFlow?.id ?? 0,
    groupId: resolvedGroupId,
    siteId: resolvedSiteId,
    name: flowName,
    description: flowDescription || undefined,
    version: resolvedVersion,
    status: resolvedStatus,
    createdAt: baseFlow?.createdAt ?? '',
    updatedAt: baseFlow?.updatedAt ?? '',
    flowDefinition: isFinal ? persistedSnapshot : previousFinal,
    flowDefinitionDraft: persistedSnapshot,
    robotSkillIds: baseFlow?.robotSkillIds ?? [],
    robotSkillInfos: baseFlow?.robotSkillInfos ?? [],
    // BT 는 최종 버전(배포 대상)과 짝을 이룬다. 최종 버전을 갱신하지 않으면 이전 BT 를 그대로 유지한다.
    behaviorTree: isFinal ? behaviorTree?.trim() || ' ' : (baseFlow?.behaviorTree ?? ' '),
    tasks,
    contents,
    nodes: normalizedNodes,
    edges: normalizedEdges,
    canvasNotes: normalizedCanvasNotes,
    viewport: resolvedViewport,
    flowMode: resolvedFlowMode,
    isPublished: isFinal
  }
}
