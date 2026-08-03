import { TaskFlowStatus, TaskFlow } from '@/types/taskflow'

type SaveMode = 'save' | 'temp'
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
  return mode === 'temp' ? TaskFlowStatus.DRAFT : TaskFlowStatus.ACTIVE
}

function getPublishedFlowDefinition(baseFlow: any) {
  return baseFlow?.flowDefinition ?? null
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

// 정식 저장('save') 시 기존 Behavior Tree가 변경되면 버전을 하나 올린다.
function resolveVersion(mode: SaveMode, baseFlow: any, behaviorTree?: string): number {
  const baseVersion = baseFlow?.version ?? 0

  // 임시저장('temp')은 버전을 유지한다.
  if (mode !== 'save') return baseVersion

  const prevBt = String(baseFlow?.behaviorTree ?? '').trim()
  const nextBt = String(behaviorTree ?? '').trim()

  // 이전 BT가 존재하고 내용이 실제로 바뀐 경우에만 +1
  // (최초 저장 시 prevBt는 placeholder ' ' → trim 후 '' 이므로 증가하지 않음)
  if (prevBt && nextBt && prevBt !== nextBt) {
    return baseVersion + 1
  }

  return baseVersion
}

export function buildTaskFlowPersistPayload({
  mode,
  flowId,
  baseFlow,
  flowName,
  flowDescription,
  nodes,
  edges,
  viewport,
  flowMode,
  behaviorTree,
  groupId,
  siteId
}: BuildTaskFlowPersistPayloadParams) {
  const normalizedNodes = nodes.map(normalizeNode)
  const normalizedEdges = edges.map(normalizeEdge)
  const tasks = buildTasksFromNodes(normalizedNodes)
  const contents = buildContentsFromNodes(normalizedNodes)

  const resolvedViewport = normalizeViewport(viewport, getBaseViewport(baseFlow))
  const resolvedFlowMode = normalizeFlowMode(flowMode ?? getBaseFlowMode(baseFlow))
  const resolvedGroupId = normalizeOrgId(groupId) ?? normalizeOrgId(baseFlow?.groupId)
  const resolvedSiteId = normalizeOrgId(siteId) ?? normalizeOrgId(baseFlow?.siteId)
  const resolvedStatus = getSnapshotStatus(mode)
  const resolvedVersion = resolveVersion(mode, baseFlow, behaviorTree)

  const snapshot = {
    id: flowId ?? baseFlow?.id ?? 0,
    name: flowName,
    groupId: resolvedGroupId,
    siteId: resolvedSiteId,
    status: resolvedStatus,
    version: resolvedVersion,
    createdAt: baseFlow?.createdAt ?? '',
    updatedAt: baseFlow?.updatedAt ?? '',
    description: flowDescription || '',
    tasks,
    contents,
    nodes: normalizedNodes,
    edges: normalizedEdges,
    viewport: resolvedViewport,
    flowMode: resolvedFlowMode
  }

  const publishedFlowDefinition = mode === 'save' ? snapshot : (getPublishedFlowDefinition(baseFlow) ?? snapshot)

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
    flowDefinition: publishedFlowDefinition,
    flowDefinitionDraft: snapshot,
    robotSkillIds: baseFlow?.robotSkillIds ?? [],
    robotSkillInfos: baseFlow?.robotSkillInfos ?? [],
    behaviorTree: mode === 'save' ? behaviorTree?.trim() || ' ' : (baseFlow?.behaviorTree ?? ' '),
    tasks,
    contents,
    nodes: normalizedNodes,
    edges: normalizedEdges,
    viewport: resolvedViewport,
    flowMode: resolvedFlowMode
  }
}
