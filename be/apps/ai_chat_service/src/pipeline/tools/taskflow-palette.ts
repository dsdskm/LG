import type { ToolContext } from '../tool.type'
import type { TaskSemantics } from '../../features/taskflow/service/property-tms-store.service'

/** taskflow 도구와 prompt 조회가 같이 쓰는 캔버스 화면 키. */
export const TASKFLOW_CANVAS_SCREEN_KEY = 'tms/taskflows/:taskFlowId/canvas'

/** 프론트가 보낸 현재 팔레트의 task-content 쌍. */
export type TaskContentRef = {
  taskId: number
  taskName: string
  contentName: string
  contentId: number
}

/** 캔버스에 이미 놓여 있는 노드. id 는 프론트가 만든 값이라 서버는 이름으로만 지목한다. */
export type GraphNodeRef = {
  id: string
  label: string
  taskName?: string
  contentName?: string
  taskType?: string
  /** 이름이 겹치는 노드에만 프론트가 붙이는 화면 순번. 유일한 이름은 없다. */
  ordinal?: number
}

export type CurrentGraph = {
  nodes: GraphNodeRef[]
  edges: Array<{ source: string; target: string; branch: boolean }>
}

export function toMatchKey(value: string): string {
  return String(value ?? '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '')
}

function readTaskflowContext(context: unknown): Record<string, unknown> | null {
  if (!context || typeof context !== 'object') return null

  const taskflow = (context as Record<string, unknown>).taskflow
  if (!taskflow || typeof taskflow !== 'object') return null
  return taskflow as Record<string, unknown>
}

export function readTaskContents(ctx: ToolContext): TaskContentRef[] {
  return readTaskContentsFromContext(ctx.context)
}

export function readTaskContentsFromContext(context: unknown): TaskContentRef[] {
  const rows = readTaskflowContext(context)?.taskContents
  if (!Array.isArray(rows)) return []

  return rows
    .filter((row): row is Record<string, unknown> => Boolean(row) && typeof row === 'object')
    .map((row) => ({
      taskId: Number(row.taskId),
      taskName: String(row.taskName || '').trim(),
      contentName: String(row.contentName || '').trim(),
      contentId: Number(row.contentId),
    }))
    .filter(
      (row) =>
        row.taskName.length > 0 &&
        row.contentName.length > 0 &&
        Number.isFinite(row.taskId) &&
        Number.isFinite(row.contentId),
    )
}

export function readCurrentGraph(ctx: ToolContext): CurrentGraph {
  return readCurrentGraphFromContext(ctx.context)
}

/** 의도 분류는 ToolContext 를 만들기 전에 돌아서 요청 context 를 직접 받는다. */
export function readCurrentGraphFromContext(context: unknown): CurrentGraph {
  const graph = readTaskflowContext(context)?.currentGraph
  if (!graph || typeof graph !== 'object') return { nodes: [], edges: [] }

  const row = graph as Record<string, unknown>
  const nodes = Array.isArray(row.nodes) ? row.nodes : []
  const edges = Array.isArray(row.edges) ? row.edges : []

  return {
    nodes: nodes
      .filter((node): node is Record<string, unknown> => Boolean(node) && typeof node === 'object')
      .map((node) => ({
        id: String(node.id || '').trim(),
        label: String(node.label || '').trim(),
        taskName: String(node.taskName || '').trim() || undefined,
        contentName: String(node.contentName || '').trim() || undefined,
        taskType: String(node.taskType || '').trim() || undefined,
        ordinal: Number.isInteger(Number(node.ordinal)) && Number(node.ordinal) > 0 ? Number(node.ordinal) : undefined,
      }))
      .filter((node) => node.id.length > 0 && node.label.length > 0),
    edges: edges
      .filter((edge): edge is Record<string, unknown> => Boolean(edge) && typeof edge === 'object')
      .map((edge) => ({
        source: String(edge.source || '').trim(),
        target: String(edge.target || '').trim(),
        branch: Boolean(edge.branch),
      }))
      .filter((edge) => edge.source.length > 0 && edge.target.length > 0),
  }
}

/** 낮을수록 좋은 매칭. 요청어가 콘텐츠명보다 길 수도 있어 양방향으로 본다. */
function scoreContentMatch(requestKey: string, contentKey: string): number | null {
  if (!contentKey) return null
  if (contentKey === requestKey) return 0
  if (contentKey.startsWith(requestKey) || requestKey.startsWith(contentKey)) return 1
  if (contentKey.includes(requestKey)) return 2
  if (requestKey.includes(contentKey)) return 3
  return null
}

function scoreByToken(requestName: string, contentKey: string): number | null {
  const tokens = requestName.split(/\s+/).filter((token) => token.length >= 2)
  const hit = tokens.some((token) => toMatchKey(token) === contentKey)
  return hit ? 4 : null
}

/** 이름이 정확히 같은 것 우선, 없으면 길이 차가 가장 작은 후보를 고른다. */
export function findContentRef(
  contentName: string,
  taskName: string,
  contents: TaskContentRef[],
): TaskContentRef | undefined {
  const key = toMatchKey(contentName)
  if (!key) return undefined

  const taskKey = toMatchKey(taskName)
  const scoped = taskKey ? contents.filter((row) => toMatchKey(row.taskName) === taskKey) : contents
  const pool = scoped.length > 0 ? scoped : contents

  let best: TaskContentRef | undefined
  let bestScore = Number.MAX_SAFE_INTEGER
  let bestGap = Number.MAX_SAFE_INTEGER

  for (const row of pool) {
    const contentKey = toMatchKey(row.contentName)
    const direct = scoreContentMatch(key, contentKey)
    const score = direct === null ? scoreByToken(contentName, contentKey) : direct
    if (score === null) continue

    const gap = Math.abs(contentKey.length - key.length)
    if (score > bestScore) continue
    if (score === bestScore && gap >= bestGap) continue

    best = row
    bestScore = score
    bestGap = gap
  }

  return best
}

export function findSuggestions(requested: string, tasks: TaskSemantics[]): string[] {
  const key = String(requested).trim().toLowerCase()
  if (!key) return []

  const matched = tasks.filter((task) => {
    if (task.taskName.toLowerCase().includes(key)) return true
    return task.triggerPhrases.some((phrase) => phrase.toLowerCase().includes(key) || key.includes(phrase.toLowerCase()))
  })

  return matched.slice(0, 3).map((task) => task.taskName)
}

/** "Parallel #2" 처럼 번호가 붙은 지목을 이름과 번호로 가른다. 프론트 parseNodeTargetName 과 같은 규칙이다. */
export function parseNodeTarget(value: unknown): { name: string; ordinal: number | null } {
  const raw = String(value ?? '').trim()
  const matched = raw.match(/^(.*\S)\s*#\s*(\d+)$/)
  if (!matched) return { name: raw, ordinal: null }

  const ordinal = Number(matched[2])
  if (!Number.isInteger(ordinal) || ordinal <= 0) return { name: raw, ordinal: null }

  return { name: matched[1].trim(), ordinal }
}

/** 프론트가 draft 를 적용할 때 쓰는 지목 문자열. 번호가 있으면 반드시 붙여 한 노드로 좁힌다. */
export function formatNodeTarget(node: GraphNodeRef): string {
  return node.ordinal ? `${node.label} #${node.ordinal}` : node.label
}

/** 이름이 같은 노드를 화면 번호 순서대로 모두 돌려준다. 번호를 지정하면 그 한 개만 남는다. */
export function findGraphNodes(name: string, graph: CurrentGraph): GraphNodeRef[] {
  const { name: baseName, ordinal } = parseNodeTarget(name)

  const matchByName = (needle: string): GraphNodeRef[] => {
    const key = toMatchKey(needle)
    if (!key) return []

    const names = (node: GraphNodeRef) => [node.label, node.taskName, node.contentName]

    const exact = graph.nodes.filter((node) => names(node).some((value) => toMatchKey(String(value ?? '')) === key))
    if (exact.length > 0) return exact

    return graph.nodes.filter((node) =>
      names(node).some((value) => {
        const target = toMatchKey(String(value ?? ''))
        return target.length > 0 && (target.includes(key) || key.includes(target))
      }),
    )
  }

  const bySortOrder = (rows: GraphNodeRef[]) =>
    rows.slice().sort((a, b) => Number(a.ordinal ?? 0) - Number(b.ordinal ?? 0))

  if (ordinal === null) return bySortOrder(matchByName(baseName))

  const numbered = bySortOrder(matchByName(baseName)).filter((node) => Number(node.ordinal ?? 0) === ordinal)
  if (numbered.length > 0) return numbered

  // "Room #3" 처럼 이름 자체에 # 이 들어간 콘텐츠일 수 있다.
  return bySortOrder(matchByName(String(name ?? '').trim()))
}

/** 같은 이름이 여러 개면 프론트와 같이 가장 나중에 추가된 노드를 고른다. */
export function findGraphNode(name: string, graph: CurrentGraph): GraphNodeRef | undefined {
  const matched = findGraphNodes(name, graph)
  return matched[matched.length - 1]
}

export function describeGraphNode(node: GraphNodeRef): string {
  const base = node.contentName && node.taskName ? `${node.taskName}(${node.contentName})` : node.label
  return node.ordinal ? `${base} #${node.ordinal}` : base
}

/** 채팅 사용자에게 보이는 문구용. 화면에 번호 배지가 없으니 "#N" 을 붙이지 않는다. */
export function describeGraphNodeForUser(node: GraphNodeRef): string {
  return node.contentName && node.taskName ? `${node.taskName}(${node.contentName})` : node.label
}

/** LLM 이 읽을 현재 캔버스 구조. 실행 흐름과 자식 분기를 구분해 적는다. */
export function describeGraph(graph: CurrentGraph): string {
  if (graph.nodes.length === 0) return '캔버스가 비어 있습니다.'

  const byId = new Map(graph.nodes.map((node) => [node.id, node]))

  return graph.nodes
    .map((node) => {
      const outgoing = graph.edges.filter((edge) => edge.source === node.id)
      const next = outgoing
        .filter((edge) => !edge.branch)
        .map((edge) => byId.get(edge.target))
        .filter((row): row is GraphNodeRef => Boolean(row))
      const children = outgoing
        .filter((edge) => edge.branch)
        .map((edge) => byId.get(edge.target))
        .filter((row): row is GraphNodeRef => Boolean(row))

      const parts = [`- ${describeGraphNode(node)}`]
      if (children.length > 0) parts.push(`자식: ${children.map(describeGraphNode).join(', ')}`)
      if (next.length > 0) parts.push(`다음: ${next.map(describeGraphNode).join(', ')}`)
      return parts.join(' | ')
    })
    .join('\n')
}
