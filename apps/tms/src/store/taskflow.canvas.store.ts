import { create } from 'zustand'
import type { Node, Edge, XYPosition, NodeChange, EdgeChange, Connection } from '@xyflow/react'
import { applyNodeChanges, applyEdgeChanges, MarkerType, addEdge, reconnectEdge as reconnectEdgeHelper } from '@xyflow/react'

import type { TaskApiPayload, ContentApiPayload, PropertySchema } from '../types/api/taskPayload'

import type { Task } from '../types/task'
import { listTasks } from '../api/taskApi'
import type { PaletteItem } from '../types/palette'
import {
  TASK_TYPE_CONTROL,
  TASK_TYPE_ROOT,
  EXECUTION_CONDITION_KEY,
  EXECUTION_CONDITION_DEFAULT
} from '../common/constants'
import { ensureStartNode, isStartNodeId, START_NODE_ID } from '../utils/node.util'
import type { FlowMode } from '../utils/node.util'
import { getHelperLines } from '../utils/helperLines'

export type NodeData = {
  label?: string

  taskId?: number
  taskName?: string
  taskType?: string

  contentId?: number
  contentName?: string
  contentTypeId?: number
  contentTypeName?: string
  contentValue?: string
  groupId?: string | null
  siteId?: string | null

  propertySchema?: PropertySchema
  properties?: Record<string, any>
}

export type RFNode = Node<NodeData>

// 엣지 시각 유형 (곡선/직선/꺾은선) — 의미(sourceHandle)와 무관한 표시 스타일
export type EdgeVisualType = 'bezier' | 'straight' | 'step'
export const DEFAULT_EDGE_TYPE: EdgeVisualType = 'bezier'

export type EdgeWaypoint = { x: number; y: number }

export type RFEdge = Edge<{
  sourceNodeId?: string | null
  targetNodeId?: string | null
  sourceHandleId?: string | null
  targetHandleId?: string | null
  edgeType?: EdgeVisualType
  // 사용자가 드래그로 추가/이동한 경유점(플로우 좌표). 연결(source/target)은 유지한 채 경로만 구부린다.
  waypoints?: EdgeWaypoint[]
}>

export type RFViewport = {
  x: number
  y: number
  zoom: number
}

type FlowSnapshot = {
  nodes: RFNode[]
  edges: RFEdge[]
  viewport: RFViewport
  flowMode: FlowMode
}

const HISTORY_LIMIT = 80
const DEFAULT_VIEWPORT: RFViewport = { x: 0, y: 0, zoom: 1 }

// undo/redo 히스토리를 localStorage 에 flow 별로 저장하기 위한 키 prefix
const HISTORY_PREFIX = 'tms:flow-history:'
// localStorage 용량 초과 시 줄여서 재시도할 히스토리 길이
const PERSIST_FALLBACK_LIMIT = 20

type PersistedHistory = {
  nodes: RFNode[]
  edges: RFEdge[]
  viewport: RFViewport
  flowMode: FlowMode
  historyPast: FlowSnapshot[]
  historyFuture: FlowSnapshot[]
}

const DEFAULT_FLOW_MODE: FlowMode = 'default'

function normalizeFlowMode(value: any): FlowMode {
  return value === 'tree' ? 'tree' : 'default'
}

function readPersistedHistory(flowKey: string): PersistedHistory | null {
  try {
    if (typeof localStorage === 'undefined') return null
    const raw = localStorage.getItem(HISTORY_PREFIX + flowKey)
    if (!raw) return null

    const parsed = JSON.parse(raw)
    if (!parsed || !Array.isArray(parsed.nodes) || !Array.isArray(parsed.edges)) return null

    return {
      nodes: parsed.nodes as RFNode[],
      edges: parsed.edges as RFEdge[],
      viewport: normalizeViewport(parsed.viewport),
      flowMode: normalizeFlowMode(parsed.flowMode),
      historyPast: Array.isArray(parsed.historyPast) ? (parsed.historyPast as FlowSnapshot[]) : [],
      historyFuture: Array.isArray(parsed.historyFuture) ? (parsed.historyFuture as FlowSnapshot[]) : []
    }
  } catch {
    return null
  }
}

function writePersistedHistory(flowKey: string, data: PersistedHistory) {
  if (typeof localStorage === 'undefined') return

  const key = HISTORY_PREFIX + flowKey
  const save = (past: FlowSnapshot[], future: FlowSnapshot[]) => {
    localStorage.setItem(
      key,
      JSON.stringify({
        nodes: data.nodes,
        edges: data.edges,
        viewport: data.viewport,
        flowMode: data.flowMode,
        historyPast: past,
        historyFuture: future
      })
    )
  }

  try {
    save(data.historyPast, data.historyFuture)
  } catch {
    // 용량 초과 등으로 실패하면 히스토리를 줄여 재시도, 그래도 실패하면 제거
    try {
      save(data.historyPast.slice(-PERSIST_FALLBACK_LIMIT), data.historyFuture.slice(0, PERSIST_FALLBACK_LIMIT))
    } catch {
      try {
        localStorage.removeItem(key)
      } catch {
        // ignore
      }
    }
  }
}

function clearPersistedHistoryByKey(flowKey: string) {
  try {
    if (typeof localStorage === 'undefined') return
    localStorage.removeItem(HISTORY_PREFIX + flowKey)
  } catch {
    // ignore
  }
}

function cloneSnapshot(snapshot: FlowSnapshot): FlowSnapshot {
  if (typeof structuredClone === 'function') return structuredClone(snapshot)
  return JSON.parse(JSON.stringify(snapshot)) as FlowSnapshot
}

function makeSnapshot(nodes: RFNode[], edges: RFEdge[], viewport: RFViewport, flowMode: FlowMode): FlowSnapshot {
  return cloneSnapshot({ nodes, edges, viewport, flowMode })
}

function pushHistory(historyPast: FlowSnapshot[], prev: FlowSnapshot) {
  const nextPast = [...historyPast, prev].slice(-HISTORY_LIMIT)

  return {
    historyPast: nextPast,
    historyFuture: [] as FlowSnapshot[],
    canUndo: nextPast.length > 0,
    canRedo: false
  }
}

function generateNodeId(): string {
  return String(Date.now())
}

function toStringOrNull(value: unknown): string | null {
  if (value === null || value === undefined || value === '') return null
  return String(value)
}

function toStringOrEmpty(value: unknown): string {
  if (value === null || value === undefined) return ''
  return String(value)
}

function normalizeViewport(viewport: any): RFViewport {
  if (Array.isArray(viewport)) {
    return {
      x: Number(viewport[0] ?? DEFAULT_VIEWPORT.x),
      y: Number(viewport[1] ?? DEFAULT_VIEWPORT.y),
      zoom: Number(viewport[2] ?? DEFAULT_VIEWPORT.zoom)
    }
  }

  if (viewport && typeof viewport === 'object') {
    return {
      x: Number(viewport.x ?? DEFAULT_VIEWPORT.x),
      y: Number(viewport.y ?? DEFAULT_VIEWPORT.y),
      zoom: Number(viewport.zoom ?? DEFAULT_VIEWPORT.zoom)
    }
  }

  return { ...DEFAULT_VIEWPORT }
}

function normalizeContentPayload(content: any): ContentApiPayload {
  return {
    contentTypeId: Number(content?.contentTypeId ?? 0),
    contentTypeName: toStringOrEmpty(content?.contentTypeName),
    contentValue: toStringOrEmpty(content?.contentValue),
    createdAt: toStringOrEmpty(content?.createdAt),
    groupId: toStringOrNull(content?.groupId),
    id: Number(content?.id ?? 0),
    name: toStringOrEmpty(content?.name),
    siteId: toStringOrNull(content?.siteId),
    status: toStringOrEmpty(content?.status),
    updatedAt: toStringOrEmpty(content?.updatedAt),
    version: toStringOrEmpty(content?.version)
  }
}

function normalizeTaskPayload(task: Task): TaskApiPayload {
  const raw = task as any
  const rawContents = Array.isArray(raw?.contents) ? raw.contents : []

  return {
    id: Number(raw?.id ?? 0),
    groupId: toStringOrNull(raw?.groupId),
    siteId: toStringOrNull(raw?.siteId),
    taskType: toStringOrEmpty(raw?.taskType),
    name: toStringOrEmpty(raw?.name),
    propertySchema: raw?.propertySchema,
    minExecVer: toStringOrEmpty(raw?.minExecVer),
    version: toStringOrEmpty(raw?.version),
    description: raw?.description ?? null,
    isDeployable: Boolean(raw?.isDeployable),
    status: toStringOrEmpty(raw?.status),
    createdAt: toStringOrEmpty(raw?.createdAt),
    updatedAt: toStringOrEmpty(raw?.updatedAt),
    contents: rawContents.map(normalizeContentPayload)
  }
}

function buildDefaultProperties(task: TaskApiPayload, content?: ContentApiPayload) {
  const propsDef = task.propertySchema?.properties ?? {}
  const result: Record<string, any> = {}

  for (const [key, def] of Object.entries(propsDef)) {
    if (def?.default !== undefined) {
      result[key] = def.default
    } else if (key === EXECUTION_CONDITION_KEY) {
      // execution_condition 은 메뉴(Boot/Manual) 선택값이며 기본은 Boot
      result[key] = EXECUTION_CONDITION_DEFAULT
    } else {
      result[key] = def?.type === 'boolean' ? false : ''
    }
  }

  if (!content) return result

  for (const [key, def] of Object.entries(propsDef)) {
    if (def?.type === 'content_reference') {
      const want = def.content_type
      const got = content.contentTypeName

      if (!want || !got || want === got) {
        result[key] = content.id
      }
    }
  }

  return result
}

function buildNodeDataFromPaletteItem(item: PaletteItem): NodeData {
  const task = item.task

  if (item.kind === 'contentNode') {
    const content = item.content

    return {
      label: content.name,
      taskId: task.id,
      taskName: task.name,
      taskType: task.taskType,
      contentId: content.id,
      contentName: content.name,
      contentTypeId: content.contentTypeId,
      contentTypeName: content.contentTypeName,
      contentValue: content.contentValue,
      groupId: content.groupId,
      siteId: content.siteId,
      propertySchema: task.propertySchema,
      properties: buildDefaultProperties(task, content)
    }
  }

  return {
    label: task.name,
    taskId: task.id,
    taskName: task.name,
    taskType: task.taskType,
    propertySchema: task.propertySchema,
    properties: buildDefaultProperties(task)
  }
}

function buildPaletteAndCatalog(tasks: TaskApiPayload[]) {
  const palette: PaletteItem[] = []
  const contentsList: ContentApiPayload[] = []

  for (const task of tasks) {
    if (task.taskType === TASK_TYPE_CONTROL) {
      palette.push({ kind: 'controlTaskNode', task, label: task.name })
      continue
    }

    const contents = task.contents ?? []
    for (const content of contents) {
      palette.push({
        kind: 'contentNode',
        task,
        content,
        label: content.name
      })
      contentsList.push(content)
    }
  }

  const dedupedCatalog = Array.from(new Map(contentsList.map((content) => [content.id, content])).values())

  return { palette, contentsList: dedupedCatalog }
}

// 캔버스의 start 노드는 코드로 자리만 만들고, 실제 표시 이름/속성 스키마는
// 서버 TaskList 의 ROOT 타입 task 에서 가져온다. (CONTROL 노드와 동일하게 property_schema 로 표현)
// tasks 로드 전에 캔버스가 초기화될 수 있으므로, tasks 가 들어온 시점에도 다시 적용한다.
// 저장된(localStorage) 노드 중 start 노드를 항상 이동 가능/삭제 불가로 정규화한다.
// (구버전에서 draggable:false 로 저장된 경우 이동이 안 되는 문제 보정)
function normalizePersistedStartNode(nodes: RFNode[]): RFNode[] {
  let changed = false
  const next = nodes.map((node) => {
    if (!isStartNodeId(node.id)) return node
    if (node.draggable === true && node.deletable === false && node.selectable !== false) return node
    changed = true
    return { ...node, draggable: true, selectable: true, deletable: false }
  })
  return changed ? next : nodes
}

function applyRootTaskToStartNode(nodes: RFNode[], tasks: TaskApiPayload[]): RFNode[] {
  const rootTask = tasks.find((task) => task.taskType === TASK_TYPE_ROOT)
  if (!rootTask) return nodes

  let changed = false
  const next = nodes.map((node) => {
    if (!isStartNodeId(node.id)) return node

    changed = true
    const existingProps = (node.data?.properties ?? {}) as Record<string, any>

    return {
      ...node,
      data: {
        ...node.data,
        label: rootTask.name,
        taskId: rootTask.id,
        taskName: rootTask.name,
        taskType: rootTask.taskType,
        propertySchema: rootTask.propertySchema,
        // 스키마 기본값 위에 기존 사용자 입력값을 덮어 보존한다.
        properties: { ...buildDefaultProperties(rootTask), ...existingProps }
      }
    }
  })

  return changed ? next : nodes
}

// 연결 거부 사유 (null = 연결 허용). 토스트 메시지 i18n 키 매핑에 사용된다.
export type ConnectDenyReason = 'control-bottom' | 'left-not-control' | 'target-not-left' | 'invalid'

function getConnectDenyReason(nodes: RFNode[], _edges: RFEdge[], c: Connection): ConnectDenyReason | null {
  if (!c.sourceHandle || !c.targetHandle) return 'invalid'

  const sourceNode = nodes.find((n) => n.id === c.source)
  if (!sourceNode) return 'invalid'

  // 모든 노드는 입력(target) 핸들('left')로만 진입할 수 있다.
  // 핸들 id 는 모드와 무관하게 'left' 로 고정이며, 가로모드=좌측 / 세로모드=상단에 위치한다.
  if (c.targetHandle !== 'left') {
    console.warn(`[CONNECT] 노드는 입력(left) 핸들로만 진입할 수 있습니다. targetHandle=${String(c.targetHandle)}`)
    return 'target-not-left'
  }

  // 출력은 우측(right, 주흐름) / 좌측(left) 만 허용한다. (bottom 출력 제거)
  // - 컨트롤 노드의 left = 분기(leftBranches)
  // - 그 외 노드의 left = false(else) 분기
  if (c.sourceHandle !== 'right' && c.sourceHandle !== 'left') {
    console.warn(`[CONNECT] 출력은 right/left 핸들만 허용합니다. sourceHandle=${String(c.sourceHandle)}`)
    return 'invalid'
  }

  return null
}

// ──────────────────────────────────────────────────────────────
// 노드 정렬(행/열 격자 정돈) 헬퍼
// ──────────────────────────────────────────────────────────────

const ALIGN_DEFAULT_WIDTH = 200
const ALIGN_DEFAULT_HEIGHT = 80
const ALIGN_GAP_X = 80 // 열 간격
const ALIGN_GAP_Y = 60 // 행 간격

function getNodeWidth(node: RFNode): number {
  return Number((node as any).measured?.width ?? (node as any).width ?? 0) || ALIGN_DEFAULT_WIDTH
}

function getNodeHeight(node: RFNode): number {
  return Number((node as any).measured?.height ?? (node as any).height ?? 0) || ALIGN_DEFAULT_HEIGHT
}

// ──────────────────────────────────────────────────────────────
// 모드 전환 시 자동 레이아웃 (레벨/계층 배치)
//   - vertical(tree): 위→아래로 레벨을 쌓고 같은 레벨은 가로로 나열
//   - horizontal(default): 좌→우로 레벨을 쌓고 같은 레벨은 세로로 나열
//   레벨(깊이)은 START(또는 indegree 0) 노드에서의 longest-path 로 계산한다.
// ──────────────────────────────────────────────────────────────

const TREE_GAP_MAIN = 70 // 레벨 간 간격(흐름 방향)
const TREE_GAP_CROSS = 50 // 같은 레벨 노드 간 간격(교차 방향)

function computeLayeredPositions(
  nodes: RFNode[],
  edges: RFEdge[],
  orientation: 'vertical' | 'horizontal'
): Map<string, XYPosition> {
  const positions = new Map<string, XYPosition>()
  if (nodes.length === 0) return positions

  const ids = new Set(nodes.map((n) => n.id))
  const nodeById = new Map(nodes.map((n) => [n.id, n]))
  const children = new Map<string, string[]>()
  const indeg = new Map<string, number>()
  for (const n of nodes) {
    children.set(n.id, [])
    indeg.set(n.id, 0)
  }
  for (const e of edges) {
    if (!ids.has(String(e.source)) || !ids.has(String(e.target))) continue
    children.get(String(e.source))!.push(String(e.target))
    indeg.set(String(e.target), (indeg.get(String(e.target)) ?? 0) + 1)
  }

  // 깊이(레벨): 위상정렬 기반 longest path
  const depth = new Map<string, number>()
  const remaining = new Map(indeg)
  const queue: string[] = []
  for (const n of nodes) {
    if ((remaining.get(n.id) ?? 0) === 0) {
      depth.set(n.id, 0)
      queue.push(n.id)
    }
  }
  let qi = 0
  while (qi < queue.length) {
    const u = queue[qi++]
    const du = depth.get(u) ?? 0
    for (const v of children.get(u) ?? []) {
      depth.set(v, Math.max(depth.get(v) ?? 0, du + 1))
      const nd = (remaining.get(v) ?? 0) - 1
      remaining.set(v, nd)
      if (nd === 0) queue.push(v)
    }
  }
  for (const n of nodes) if (!depth.has(n.id)) depth.set(n.id, 0)

  // 레벨 내 순서: START → indegree 0 순으로 DFS preorder
  const order = new Map<string, number>()
  const visited = new Set<string>()
  let counter = 0
  const dfs = (u: string) => {
    if (visited.has(u)) return
    visited.add(u)
    order.set(u, counter++)
    for (const v of children.get(u) ?? []) dfs(v)
  }
  const roots = [
    START_NODE_ID,
    ...nodes.map((n) => n.id).filter((id) => id !== START_NODE_ID && (indeg.get(id) ?? 0) === 0)
  ].filter((id) => ids.has(id))
  for (const r of roots) dfs(r)
  for (const n of nodes) if (!visited.has(n.id)) dfs(n.id)

  // 레벨별 그룹 + 정렬
  const layers = new Map<number, string[]>()
  for (const n of nodes) {
    const d = depth.get(n.id) ?? 0
    if (!layers.has(d)) layers.set(d, [])
    layers.get(d)!.push(n.id)
  }
  for (const arr of layers.values()) {
    arr.sort((a, b) => (order.get(a) ?? 0) - (order.get(b) ?? 0))
  }

  // 각 레벨의 흐름축 시작 좌표(레벨 간 간격은 직전 레벨의 최대 크기 기준)
  const sortedDepths = [...layers.keys()].sort((a, b) => a - b)
  const mainAxisStart = new Map<number, number>()
  let mainCursor = 0
  for (const d of sortedDepths) {
    mainAxisStart.set(d, mainCursor)
    const layerNodes = layers.get(d)!
    const layerMainSize = Math.max(
      ...layerNodes.map((id) =>
        orientation === 'vertical' ? getNodeHeight(nodeById.get(id)!) : getNodeWidth(nodeById.get(id)!)
      )
    )
    mainCursor += layerMainSize + TREE_GAP_MAIN
  }

  // 좌표 배정 (교차축은 레벨 내에서 누적 배치)
  for (const d of sortedDepths) {
    const layerNodes = layers.get(d)!
    let crossCursor = 0
    for (const id of layerNodes) {
      const node = nodeById.get(id)!
      const w = getNodeWidth(node)
      const h = getNodeHeight(node)
      const main = mainAxisStart.get(d) ?? 0
      if (orientation === 'vertical') {
        positions.set(id, { x: Math.round(crossCursor), y: Math.round(main) })
        crossCursor += w + TREE_GAP_CROSS
      } else {
        positions.set(id, { x: Math.round(main), y: Math.round(crossCursor) })
        crossCursor += h + TREE_GAP_CROSS
      }
    }
  }

  return positions
}

// 가로 레이아웃 좌표를 시계방향 90° 회전해 세로 레이아웃 좌표를 만든다.
//   - 노드 중심을 CW 90° 회전: (cx, cy) → (-cy, cx)  (화면 좌표계 기준 시각적 시계방향)
//   - 회전 후 좌상단 기준으로 되돌리고, 전체를 양수 영역으로 정규화한다.
//   이렇게 하면 "오른쪽으로 나가던 주흐름 → 아래", "왼쪽으로 나가던 분기 → 위"가
//   자식 배치까지 포함해 그대로 회전된 형태가 된다.
function rotatePositionsCW(nodes: RFNode[], positions: Map<string, XYPosition>): Map<string, XYPosition> {
  const rotated = new Map<string, XYPosition>()

  const tmp: { id: string; x: number; y: number }[] = []
  let minX = Infinity
  let minY = Infinity

  for (const node of nodes) {
    const p = positions.get(node.id)
    if (!p) continue
    const w = getNodeWidth(node)
    const h = getNodeHeight(node)
    const cx = p.x + w / 2
    const cy = p.y + h / 2
    // CW 90°: (cx, cy) → (-cy, cx)
    const rx = -cy
    const ry = cx
    // 회전 후에도 노드는 세워진 채이므로 좌상단은 회전된 중심에서 원래 w,h 로 되돌린다
    const x = rx - w / 2
    const y = ry - h / 2
    tmp.push({ id: node.id, x, y })
    if (x < minX) minX = x
    if (y < minY) minY = y
  }

  for (const t of tmp) {
    rotated.set(t.id, { x: Math.round(t.x - minX), y: Math.round(t.y - minY) })
  }

  return rotated
}

// 중심값을 정렬한 뒤, 그룹 시작점(anchor) 기준 임계값을 넘으면 새 그룹으로 분리한다.
// (인접 비교만 하면 대각선 배치가 한 그룹으로 길게 이어지므로 anchor 기준으로 묶는다)
function clusterNodesByCenter(
  nodes: RFNode[],
  getCenter: (n: RFNode) => number,
  threshold: number
): Map<string, number> {
  const sorted = [...nodes].sort((a, b) => getCenter(a) - getCenter(b))
  const indexById = new Map<string, number>()

  let group = 0
  let anchor: number | null = null

  for (const node of sorted) {
    const center = getCenter(node)
    if (anchor === null) anchor = center
    else if (center - anchor > threshold) {
      group += 1
      anchor = center
    }
    indexById.set(node.id, group)
  }

  return indexById
}

// 선택 노드를 행/열 구조를 유지한 채 균등 간격 격자로 재배치할 위치를 계산한다.
// (반대축 좌표를 평균값으로 통일하면 노드들이 한 줄로 뭉치므로, 행·열 군집을 유지한다)
function computeAlignedGridPositions(selectedNodes: RFNode[]): Map<string, XYPosition> {
  const centerX = (n: RFNode) => Number(n.position?.x ?? 0) + getNodeWidth(n) / 2
  const centerY = (n: RFNode) => Number(n.position?.y ?? 0) + getNodeHeight(n) / 2

  // 행/열 군집 임계값: 노드 크기 기준 (이 거리 안의 노드는 같은 행/열로 본다)
  const avgWidth = selectedNodes.reduce((s, n) => s + getNodeWidth(n), 0) / selectedNodes.length
  const avgHeight = selectedNodes.reduce((s, n) => s + getNodeHeight(n), 0) / selectedNodes.length
  const rowThreshold = Math.max(30, avgHeight * 0.6)
  const colThreshold = Math.max(40, avgWidth * 0.6)

  const rowIndexById = clusterNodesByCenter(selectedNodes, centerY, rowThreshold)
  const colIndexById = clusterNodesByCenter(selectedNodes, centerX, colThreshold)

  const numRows = Math.max(...selectedNodes.map((n) => rowIndexById.get(n.id) ?? 0)) + 1
  const numCols = Math.max(...selectedNodes.map((n) => colIndexById.get(n.id) ?? 0)) + 1

  // 각 열 폭 = 그 열 노드들의 최대 폭, 각 행 높이 = 그 행 노드들의 최대 높이
  const colWidth = new Array<number>(numCols).fill(0)
  const rowHeight = new Array<number>(numRows).fill(0)
  for (const node of selectedNodes) {
    const ci = colIndexById.get(node.id) ?? 0
    const ri = rowIndexById.get(node.id) ?? 0
    colWidth[ci] = Math.max(colWidth[ci], getNodeWidth(node))
    rowHeight[ri] = Math.max(rowHeight[ri], getNodeHeight(node))
  }

  // 격자 시작점은 현재 선택 영역의 좌상단
  const startX = Math.min(...selectedNodes.map((n) => Number(n.position?.x ?? 0)))
  const startY = Math.min(...selectedNodes.map((n) => Number(n.position?.y ?? 0)))

  const colX = new Array<number>(numCols).fill(0)
  for (let j = 0; j < numCols; j++) {
    colX[j] = j === 0 ? startX : colX[j - 1] + colWidth[j - 1] + ALIGN_GAP_X
  }
  const rowY = new Array<number>(numRows).fill(0)
  for (let i = 0; i < numRows; i++) {
    rowY[i] = i === 0 ? startY : rowY[i - 1] + rowHeight[i - 1] + ALIGN_GAP_Y
  }

  const positionById = new Map<string, XYPosition>()
  for (const node of selectedNodes) {
    const ci = colIndexById.get(node.id) ?? 0
    const ri = rowIndexById.get(node.id) ?? 0
    // 셀 안에서 가운데 정렬
    const x = Math.round(colX[ci] + (colWidth[ci] - getNodeWidth(node)) / 2)
    const y = Math.round(rowY[ri] + (rowHeight[ri] - getNodeHeight(node)) / 2)
    positionById.set(node.id, { x, y })
  }

  return positionById
}

// ──────────────────────────────────────────────────────────────
// Store 상태/액션 타입
// ──────────────────────────────────────────────────────────────

type FlowEditorState = {
  loadingTasks: boolean
  tasks: TaskApiPayload[]
  palette: PaletteItem[]
  contentsList: ContentApiPayload[]

  nodes: RFNode[]
  edges: RFEdge[]
  viewport: RFViewport

  historyPast: FlowSnapshot[]
  historyFuture: FlowSnapshot[]
  canUndo: boolean
  canRedo: boolean

  // 현재 편집 중인 flow 의 localStorage 키 ('new' | flowId)
  flowKey: string | null

  // 캔버스 표시 방향 모드 (default: 좌→우, tree: 위→아래)
  flowMode: FlowMode
  // 모드별 노드 위치 기억 (토글 시 매번 재배치돼 배치가 날아가지 않도록).
  // 해당 모드 첫 진입에만 자동 레이아웃하고, 이후엔 저장된 위치를 복원한다. (세션 한정, 미영속)
  positionsByMode: Partial<Record<FlowMode, Record<string, XYPosition>>>

  // 드래그 중 정렬 보조선 좌표 (flow 좌표, 드래그 끝나면 undefined). 미영속.
  helperLineVertical?: number
  helperLineHorizontal?: number

  selectedNodeId: string | null
  selectedEdgeId: string | null
  selectedPalette: NodeData | null

  loadTasks: (groupId: string | null, siteId: string | null) => Promise<void>

  addNodeFromPalette: (item: Extract<PaletteItem, { kind: 'contentNode' }>, position: XYPosition) => void

  addControlNodeFromTask: (task: TaskApiPayload, position: XYPosition) => void

  selectNode: (id: string | null) => void
  selectEdge: (id: string | null) => void
  selectPalette: (item: PaletteItem | null) => void

  updateSelectedNodeProps: (patch: Record<string, any>) => void

  setNodes: (nodes: RFNode[]) => void
  setEdges: (edges: RFEdge[]) => void
  setViewport: (viewport: RFViewport) => void

  applyNodesChange: (changes: NodeChange<RFNode>[]) => void
  applyEdgesChange: (changes: EdgeChange<RFEdge>[]) => void

  connectEdge: (connection: Connection) => ConnectDenyReason | null
  // 엣지 끝점을 다른 핸들로 끌어 재연결(연결 규칙 검증 후 적용). 거부 사유 반환(null=성공)
  reconnectEdge: (oldEdge: RFEdge, newConnection: Connection) => ConnectDenyReason | null
  // 경유점(waypoint) 라이브 업데이트 (드래그 중. 히스토리는 남기지 않음)
  setEdgeWaypoints: (edgeId: string, waypoints: EdgeWaypoint[]) => void
  // 정렬 보조선 좌표 직접 설정 (경유점 드래그 등에서 사용. undefined 로 끄기). 히스토리 미기록.
  setHelperLines: (vertical?: number, horizontal?: number) => void
  // 드래그 시작 시 현재 상태를 한 번 히스토리에 기록 (undo 1스텝용)
  pushHistoryCheckpoint: () => void
  getSelectedNode: () => RFNode | null
  loadFromFlowDefinition: (def: Record<string, unknown>) => void

  // flowKey 기준으로 localStorage 에 저장된 히스토리가 있으면 복원, 없으면 def 로 초기화
  initFlowEditor: (flowKey: string, def: Record<string, unknown>) => void
  // 다른 taskflow 진입 등으로 에디터를 비울 때 사용 (이전 flow 의 작업상태/undo 가 남지 않도록)
  resetFlowEditor: () => void
  // 특정 flow(또는 현재 flow) 의 저장된 히스토리 제거
  clearPersistedHistory: (flowKey?: string) => void
  // 신규 flow 생성 직후처럼 flowKey 가 바뀔 때, 현재 편집 상태(모드 포함)를 새 키로 이관한다.
  // (이후 라우트 변경으로 재초기화돼도 새 키의 저장본에서 복원되어 모드/배치가 유지됨)
  adoptFlowKey: (newKey: string) => void

  deleteSelectedNode: () => void
  deleteSelectedEdge: () => void
  // 선택된 엣지의 시각 유형(곡선/직선/꺾은선) 변경
  setSelectedEdgeType: (edgeType: EdgeVisualType) => void

  undo: () => void
  redo: () => void

  confirmDeleteOpen: boolean
  openDeleteConfirm: () => void
  closeDeleteConfirm: () => void
  confirmDeleteSelectedNode: () => void

  confirmDeleteEdgeOpen: boolean
  openDeleteEdgeConfirm: () => void
  closeDeleteEdgeConfirm: () => void
  confirmDeleteSelectedEdge: () => void

  alignSelectedNodesAuto: () => void

  // 표시 방향 모드 전환 (전환 시 자동 레이아웃 적용)
  setFlowMode: (mode: FlowMode) => void
}

// ──────────────────────────────────────────────────────────────
// Store 구현
// ──────────────────────────────────────────────────────────────

export const useFlowEditorStore = create<FlowEditorState>((set, get) => ({
  loadingTasks: false,

  tasks: [],
  palette: [],
  contentsList: [],

  nodes: [],
  edges: [],
  viewport: { ...DEFAULT_VIEWPORT },

  historyPast: [],
  historyFuture: [],
  canUndo: false,
  canRedo: false,

  flowKey: null,

  flowMode: DEFAULT_FLOW_MODE,
  positionsByMode: {},

  helperLineVertical: undefined,
  helperLineHorizontal: undefined,

  selectedNodeId: null,
  selectedEdgeId: null,
  selectedPalette: null,

  loadTasks: async (groupId: string | null, siteId: string | null) => {
    set({ loadingTasks: true })
    try {
      const rawTasks = await listTasks({ groupId, siteId, include: 'contents' })
      const tasks = rawTasks.map(normalizeTaskPayload)
      const { palette, contentsList } = buildPaletteAndCatalog(tasks)
      // tasks 로드 전에 캔버스가 먼저 초기화된 경우, 지금 start 노드에 ROOT task 정보를 반영한다.
      set((state) => ({
        tasks,
        palette,
        contentsList,
        nodes: applyRootTaskToStartNode(state.nodes, tasks)
      }))
    } catch (e) {
      console.error('loadTasks failed:', e)
      set({ tasks: [], palette: [], contentsList: [] })
    } finally {
      set({ loadingTasks: false })
    }
  },

  addNodeFromPalette: (item, position) => {
    const id = generateNodeId()
    const nodeData = buildNodeDataFromPaletteItem(item)

    const newNode: RFNode = {
      id,
      type: 'taskNode',
      position,
      data: nodeData
    }

    const prev = makeSnapshot(get().nodes, get().edges, get().viewport, get().flowMode)
    const nextNodes = [...get().nodes, newNode]

    set((state) => ({
      nodes: nextNodes,
      selectedNodeId: id,
      selectedEdgeId: null,
      selectedPalette: null,
      ...pushHistory(state.historyPast, prev)
    }))
  },

  addControlNodeFromTask: (task, position) => {
    const id = generateNodeId()

    const nodeData: NodeData = {
      groupId: task.groupId,
      siteId: task.siteId,
      label: task.name,
      taskId: task.id,
      taskName: task.name,
      taskType: task.taskType,
      propertySchema: task.propertySchema,
      properties: buildDefaultProperties(task)
    }

    const newNode: RFNode = {
      id,
      type: 'taskNode',
      position,
      data: nodeData
    }

    const prev = makeSnapshot(get().nodes, get().edges, get().viewport, get().flowMode)
    const nextNodes = [...get().nodes, newNode]

    set((state) => ({
      nodes: nextNodes,
      selectedNodeId: id,
      selectedEdgeId: null,
      selectedPalette: null,
      ...pushHistory(state.historyPast, prev)
    }))
  },

  selectNode: (id) =>
    set({
      selectedNodeId: id,
      selectedEdgeId: null,
      selectedPalette: null
    }),

  selectEdge: (id) =>
    set({
      selectedEdgeId: id,
      selectedNodeId: null,
      selectedPalette: null
    }),

  selectPalette: (item) =>
    set({
      selectedNodeId: null,
      selectedEdgeId: null,
      selectedPalette: item ? buildNodeDataFromPaletteItem(item) : null
    }),

  updateSelectedNodeProps: (patch) => {
    const { selectedNodeId, nodes, edges, viewport } = get()
    if (!selectedNodeId) return

    const prev = makeSnapshot(nodes, edges, viewport, get().flowMode)

    const nextNodes = nodes.map((node) => {
      if (node.id !== selectedNodeId) return node

      return {
        ...node,
        data: {
          ...node.data,
          properties: {
            ...(node.data?.properties ?? {}),
            ...patch
          }
        }
      }
    })

    set((state) => ({
      nodes: nextNodes,
      ...pushHistory(state.historyPast, prev)
    }))
  },

  setNodes: (nodes) => set({ nodes }),
  setEdges: (edges) => set({ edges }),
  setViewport: (viewport) => set({ viewport: normalizeViewport(viewport) }),

  loadFromFlowDefinition: (def) => {
    const tasks = get().tasks
    const safeDef = ensureStartNode(def, tasks)

    const rawNodes = Array.isArray((safeDef as any).nodes) ? ((safeDef as any).nodes as RFNode[]) : []
    const nodes = applyRootTaskToStartNode(rawNodes, tasks)

    const edges = Array.isArray((safeDef as any).edges) ? ((safeDef as any).edges as RFEdge[]) : []
    const viewport = normalizeViewport((safeDef as any).viewport)

    const flowMode = normalizeFlowMode((safeDef as any).flowMode)

    set({
      nodes,
      edges,
      viewport,
      flowMode,
      positionsByMode: {},
      helperLineVertical: undefined,
      helperLineHorizontal: undefined,
      selectedNodeId: null,
      selectedEdgeId: null,
      selectedPalette: null,
      historyPast: [],
      historyFuture: [],
      canUndo: false,
      canRedo: false
    })
  },

  initFlowEditor: (flowKey, def) => {
    const persisted = readPersistedHistory(flowKey)

    if (persisted) {
      set({
        flowKey,
        // 과거 버전에서 저장된 히스토리는 start 노드가 draggable:false 로 굳어 있을 수 있어
        // 복원 시 이동 가능하도록 정규화한다. (loadFromFlowDefinition 경로와 동일한 보정)
        nodes: normalizePersistedStartNode(persisted.nodes),
        edges: persisted.edges,
        viewport: persisted.viewport,
        flowMode: persisted.flowMode,
        positionsByMode: {},
        historyPast: persisted.historyPast,
        historyFuture: persisted.historyFuture,
        canUndo: persisted.historyPast.length > 0,
        canRedo: persisted.historyFuture.length > 0,
        selectedNodeId: null,
        selectedEdgeId: null,
        selectedPalette: null
      })
      return
    }

    // 저장된 히스토리가 없으면 flowKey 만 설정하고 def 로 초기화
    set({ flowKey })
    get().loadFromFlowDefinition(def)
  },

  resetFlowEditor: () =>
    set({
      // flowKey=null 로 두어 비어있는 동안 localStorage 에 잘못 저장되지 않게 한다
      flowKey: null,
      flowMode: DEFAULT_FLOW_MODE,
      positionsByMode: {},
      helperLineVertical: undefined,
      helperLineHorizontal: undefined,
      nodes: [],
      edges: [],
      viewport: { ...DEFAULT_VIEWPORT },
      historyPast: [],
      historyFuture: [],
      canUndo: false,
      canRedo: false,
      selectedNodeId: null,
      selectedEdgeId: null,
      selectedPalette: null
    }),

  clearPersistedHistory: (flowKey) => {
    const key = flowKey ?? get().flowKey
    if (!key) return
    clearPersistedHistoryByKey(key)
  },

  adoptFlowKey: (newKey) => {
    const { nodes, edges, viewport, flowMode, historyPast, historyFuture } = get()
    // 현재 편집 상태를 새 키로 즉시 저장해 두면, 라우트 변경 → resetFlowEditor → initFlowEditor 가
    // 새 키의 저장본을 읽어 모드/노드 배치/히스토리를 그대로 복원한다.
    writePersistedHistory(newKey, {
      nodes,
      edges,
      viewport,
      flowMode,
      historyPast,
      historyFuture
    })
    set({ flowKey: newKey })
  },

  applyNodesChange: (changes) => {
    const safeChanges = changes.filter((c) => {
      if (!('id' in c)) return true
      if (!isStartNodeId(c.id)) return true
      return c.type !== 'remove'
    })

    if (safeChanges.length === 0) return

    // 단일 노드 위치 변경(드래그)이면 정렬 보조: 가까운 노드에 스냅하고 가이드선 좌표를 계산한다.
    // change.position 을 직접 보정한 뒤 applyNodeChanges 에 넘긴다(공식 helper-lines 패턴).
    let helperLineVertical: number | undefined = undefined
    let helperLineHorizontal: number | undefined = undefined

    const positionChanges = safeChanges.filter((c) => c.type === 'position' && (c as any).position)
    if (positionChanges.length === 1) {
      const change = positionChanges[0] as any
      const helper = getHelperLines(change.position, String(change.id), get().nodes)

      if (helper.snapX !== undefined) change.position.x = helper.snapX
      if (helper.snapY !== undefined) change.position.y = helper.snapY

      // 가이드선은 드래그 중에만 표시 (드래그 종료 시점에는 스냅만 적용하고 선은 감춘다)
      if (change.dragging) {
        helperLineVertical = helper.vertical
        helperLineHorizontal = helper.horizontal
      }
    }

    const next = applyNodeChanges(safeChanges, get().nodes) as RFNode[]

    const hasMeaningfulChange = safeChanges.some((c) => {
      // 선택/측정(dimensions)은 undo 대상이 아니다.
      // 특히 'dimensions'는 노드가 마운트·측정될 때마다 발생하므로
      // 히스토리에 쌓이면 undo를 끝까지 해도 canUndo가 다시 true가 된다.
      if (c.type === 'select') return false
      if (c.type === 'dimensions') return false
      // 드래그 '중'에는 쌓지 않고, 드래그가 끝난 시점(position && !dragging)에만 쌓는다.
      if (c.type === 'position' && (c as any).dragging === true) return false
      return true
    })

    if (!hasMeaningfulChange) {
      set({ nodes: next, helperLineVertical, helperLineHorizontal })
      return
    }

    const prev = makeSnapshot(get().nodes, get().edges, get().viewport, get().flowMode)

    set((state) => ({
      nodes: next,
      helperLineVertical,
      helperLineHorizontal,
      ...pushHistory(state.historyPast, prev)
    }))
  },

  applyEdgesChange: (changes) => {
    if (changes.length === 0) return

    const hasMeaningfulChange = changes.some((c) => c.type !== 'select')
    const next = applyEdgeChanges(changes, get().edges)

    if (!hasMeaningfulChange) {
      set({ edges: next })
      return
    }

    const prev = makeSnapshot(get().nodes, get().edges, get().viewport, get().flowMode)

    set((state) => ({
      edges: next,
      ...pushHistory(state.historyPast, prev)
    }))
  },

  connectEdge: (connection) => {
    const edges = get().edges
    const denyReason = getConnectDenyReason(get().nodes, edges, connection)
    if (denyReason) return denyReason

    const edgeWithArrow: RFEdge = {
      id: String(Date.now()),
      source: connection.source ?? '',
      target: connection.target ?? '',
      sourceHandle: connection.sourceHandle ?? null,
      targetHandle: connection.targetHandle ?? null,
      data: {
        sourceNodeId: connection.source ?? null,
        targetNodeId: connection.target ?? null,
        sourceHandleId: connection.sourceHandle ?? null,
        targetHandleId: connection.targetHandle ?? null,
        edgeType: DEFAULT_EDGE_TYPE
      },
      markerEnd: {
        type: MarkerType.ArrowClosed,
        width: 10,
        height: 10,
        color: '#94a3b8'
      },
      style: {
        stroke: '#94a3b8',
        strokeWidth: 1.25
      }
    }

    const next = addEdge(edgeWithArrow, edges)
    const prev = makeSnapshot(get().nodes, get().edges, get().viewport, get().flowMode)

    set((state) => ({
      edges: next,
      ...pushHistory(state.historyPast, prev)
    }))

    return null
  },

  reconnectEdge: (oldEdge, newConnection) => {
    const denyReason = getConnectDenyReason(get().nodes, get().edges, newConnection)
    if (denyReason) return denyReason

    const prev = makeSnapshot(get().nodes, get().edges, get().viewport, get().flowMode)
    const reconnected = reconnectEdgeHelper(oldEdge, newConnection, get().edges)

    // 끝점이 바뀌었으니 data 의 연결 메타를 갱신하고, 기존 경유점은 의미가 없어지므로 제거한다.
    const next = reconnected.map((edge) =>
      edge.id === oldEdge.id
        ? {
          ...edge,
          data: {
            ...edge.data,
            sourceNodeId: newConnection.source ?? null,
            targetNodeId: newConnection.target ?? null,
            sourceHandleId: newConnection.sourceHandle ?? null,
            targetHandleId: newConnection.targetHandle ?? null,
            waypoints: undefined
          }
        }
        : edge
    ) as RFEdge[]

    set((state) => ({
      edges: next,
      ...pushHistory(state.historyPast, prev)
    }))

    return null
  },

  setEdgeWaypoints: (edgeId, waypoints) => {
    set((state) => ({
      edges: state.edges.map((edge) =>
        edge.id === edgeId ? { ...edge, data: { ...edge.data, waypoints } } : edge
      )
    }))
  },

  setHelperLines: (vertical, horizontal) => {
    set({ helperLineVertical: vertical, helperLineHorizontal: horizontal })
  },

  pushHistoryCheckpoint: () => {
    const prev = makeSnapshot(get().nodes, get().edges, get().viewport, get().flowMode)
    set((state) => ({ ...pushHistory(state.historyPast, prev) }))
  },

  getSelectedNode: () => {
    const { selectedNodeId, nodes } = get()
    if (!selectedNodeId) return null
    return nodes.find((node) => node.id === selectedNodeId) ?? null
  },

  deleteSelectedNode: () => {
    const { selectedNodeId, nodes, edges, viewport } = get()
    if (!selectedNodeId) return
    if (isStartNodeId(selectedNodeId)) return

    const prev = makeSnapshot(nodes, edges, viewport, get().flowMode)

    const nextNodes = nodes.filter((node) => node.id !== selectedNodeId)
    const nextEdges = edges.filter((edge) => edge.source !== selectedNodeId && edge.target !== selectedNodeId)

    set((state) => ({
      nodes: nextNodes,
      edges: nextEdges,
      selectedNodeId: null,
      selectedEdgeId: null,
      selectedPalette: null,
      ...pushHistory(state.historyPast, prev)
    }))
  },

  deleteSelectedEdge: () => {
    const { selectedEdgeId, edges, viewport } = get()
    if (!selectedEdgeId) return

    const prev = makeSnapshot(get().nodes, edges, viewport,get().flowMode)

    set((state) => ({
      edges: edges.filter((edge) => edge.id !== selectedEdgeId),
      selectedEdgeId: null,
      ...pushHistory(state.historyPast, prev)
    }))
  },

  setSelectedEdgeType: (edgeType) => {
    const { selectedEdgeId, edges, nodes, viewport } = get()
    if (!selectedEdgeId) return

    const target = edges.find((edge) => edge.id === selectedEdgeId)
    if (!target || (target.data?.edgeType ?? DEFAULT_EDGE_TYPE) === edgeType) return

    const prev = makeSnapshot(nodes, edges, viewport, get().flowMode)

    const nextEdges = edges.map((edge) =>
      edge.id === selectedEdgeId ? { ...edge, data: { ...edge.data, edgeType } } : edge
    )

    set((state) => ({
      edges: nextEdges,
      ...pushHistory(state.historyPast, prev)
    }))
  },

  undo: () => {
    const { historyPast, nodes, edges, viewport, flowMode, historyFuture } = get()
    if (historyPast.length === 0) return

    const previous = historyPast[historyPast.length - 1]
    const current = makeSnapshot(nodes, edges, viewport, flowMode)
    const nextPast = historyPast.slice(0, -1)
    const nextFuture = [current, ...historyFuture].slice(0, HISTORY_LIMIT)
    const previousSnapshot = cloneSnapshot(previous)

    set({
      nodes: previousSnapshot.nodes,
      edges: previousSnapshot.edges,
      viewport: previousSnapshot.viewport,
      flowMode: normalizeFlowMode(previousSnapshot.flowMode),
      selectedNodeId: null,
      selectedEdgeId: null,
      selectedPalette: null,
      historyPast: nextPast,
      historyFuture: nextFuture,
      canUndo: nextPast.length > 0,
      canRedo: nextFuture.length > 0
    })
  },

  redo: () => {
    const { historyFuture, nodes, edges, viewport, flowMode, historyPast } = get()
    if (historyFuture.length === 0) return

    const next = historyFuture[0]
    const current = makeSnapshot(nodes, edges, viewport, flowMode)
    const nextFuture = historyFuture.slice(1)
    const nextPast = [...historyPast, current].slice(-HISTORY_LIMIT)
    const nextSnapshot = cloneSnapshot(next)

    set({
      nodes: nextSnapshot.nodes,
      edges: nextSnapshot.edges,
      viewport: nextSnapshot.viewport,
      flowMode: normalizeFlowMode(nextSnapshot.flowMode),
      selectedNodeId: null,
      selectedEdgeId: null,
      selectedPalette: null,
      historyPast: nextPast,
      historyFuture: nextFuture,
      canUndo: nextPast.length > 0,
      canRedo: nextFuture.length > 0
    })
  },

  confirmDeleteOpen: false,

  openDeleteConfirm: () => {
    const { selectedNodeId } = get()
    if (!selectedNodeId) return
    if (isStartNodeId(selectedNodeId)) return
    set({ confirmDeleteOpen: true })
  },

  closeDeleteConfirm: () => set({ confirmDeleteOpen: false }),

  confirmDeleteSelectedNode: () => {
    set({ confirmDeleteOpen: false })
    get().deleteSelectedNode()
  },

  confirmDeleteEdgeOpen: false,

  openDeleteEdgeConfirm: () => {
    const { selectedEdgeId } = get()
    if (!selectedEdgeId) return
    set({ confirmDeleteEdgeOpen: true })
  },

  closeDeleteEdgeConfirm: () => set({ confirmDeleteEdgeOpen: false }),

  confirmDeleteSelectedEdge: () => {
    set({ confirmDeleteEdgeOpen: false })
    get().deleteSelectedEdge()
  },

  alignSelectedNodesAuto: () => {
    const { nodes, edges, viewport } = get()

    const selectedNodes = nodes.filter((node) => node.selected)
    if (selectedNodes.length < 2) return

    const prev = makeSnapshot(nodes, edges, viewport, get().flowMode)
    const positionById = computeAlignedGridPositions(selectedNodes)

    const nextNodes = nodes.map((node) => {
      const position = positionById.get(node.id)
      return node.selected && position ? { ...node, position } : node
    })

    set((state) => ({
      nodes: nextNodes,
      ...pushHistory(state.historyPast, prev)
    }))
  },

  setFlowMode: (mode) => {
    const { flowMode, nodes, edges, viewport, positionsByMode } = get()
    if (flowMode === mode) return

    const prev = makeSnapshot(nodes, edges, viewport, flowMode)

    // 1) 떠나는(현재) 모드의 노드 위치를 기억해 둔다
    const currentPositions: Record<string, XYPosition> = {}
    for (const node of nodes) {
      currentPositions[node.id] = { x: node.position?.x ?? 0, y: node.position?.y ?? 0 }
    }
    const nextPositionsByMode = { ...positionsByMode, [flowMode]: currentPositions }

    // 2) 모드를 전환할 때마다 대상 방향으로 자동 정렬한다.
    //    세로(tree)는 가로 레이아웃을 시계방향 90° 회전한 형태로 만든다.
    const base = computeLayeredPositions(nodes, edges, 'horizontal')
    const auto = mode === 'tree' ? rotatePositionsCW(nodes, base) : base

    const nextNodes = nodes.map((node) => {
      const position = auto.get(node.id)
      return position ? { ...node, position } : node
    })

    set((state) => ({
      flowMode: mode,
      nodes: nextNodes,
      positionsByMode: nextPositionsByMode,
      ...pushHistory(state.historyPast, prev)
    }))
  }
}))

// nodes/edges/viewport/history 가 바뀔 때마다 현재 flow 의 히스토리를 localStorage 에 저장
useFlowEditorStore.subscribe((state, prev) => {
  if (!state.flowKey) return

  if (
    state.nodes === prev.nodes &&
    state.edges === prev.edges &&
    state.viewport === prev.viewport &&
    state.flowMode === prev.flowMode &&
    state.historyPast === prev.historyPast &&
    state.historyFuture === prev.historyFuture
  ) {
    return
  }

  writePersistedHistory(state.flowKey, {
    nodes: state.nodes,
    edges: state.edges,
    viewport: state.viewport,
    flowMode: state.flowMode,
    historyPast: state.historyPast,
    historyFuture: state.historyFuture
  })
})

export { buildDefaultProperties, generateNodeId, buildNodeDataFromPaletteItem }
