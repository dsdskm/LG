import { isBranchEdge } from './assistantDraft'

/** "몇 번째 노드" 는 화면 좌표나 노드가 만들어진 순서가 아니라 Start 로부터의 흐름 순서다.
 * 순차(오른쪽 핸들)를 먼저 따라가고, 자식(왼쪽 핸들)은 그 다음에 방문한다.
 * 서버가 붙여 주는 "#N" 도 이 순서를 기준으로 한다.
 */

export type FlowNodeLike = { id: string | number }
export type FlowEdgeLike = { source?: string | number; target?: string | number; sourceHandle?: string | null }

const START_NODE_ID = 'start'

/** Start 에서 시작해 흐름 순서로 노드를 나열한다. 흐름에 닿지 않는 노드는 마지막에 원래 순서로 붙인다. */
export function orderNodesByFlow<T extends FlowNodeLike>(nodes: T[], edges: FlowEdgeLike[]): T[] {
  const nodeById = new Map(nodes.map((node) => [String(node.id), node]))
  const outgoing = new Map<string, FlowEdgeLike[]>()

  for (const edge of edges) {
    const source = String(edge?.source ?? '')
    if (!source) continue
    const bucket = outgoing.get(source)
    if (bucket) bucket.push(edge)
    else outgoing.set(source, [edge])
  }

  const ordered: T[] = []
  const visited = new Set<string>()

  const walk = (nodeId: string) => {
    if (visited.has(nodeId)) return
    visited.add(nodeId)

    const node = nodeById.get(nodeId)
    if (node && nodeId !== START_NODE_ID) ordered.push(node)

    const next = outgoing.get(nodeId) ?? []
    // 순차 흐름을 먼저 끝까지 따라간다. 그래야 "두 번째 Parallel" 이 주 흐름 기준이 된다.
    const sequential = next.filter((edge) => !isBranchEdge(edge))
    const branches = next.filter((edge) => isBranchEdge(edge))

    for (const edge of [...sequential, ...branches]) {
      const target = String(edge?.target ?? '')
      if (target) walk(target)
    }
  }

  walk(START_NODE_ID)
  // Start 에 연결되지 않은 노드(별도 공간에 만든 것)도 뒤에 남겨 지목할 수 있게 한다.
  for (const node of nodes) {
    if (String(node.id) === START_NODE_ID) continue
    if (visited.has(String(node.id))) continue
    ordered.push(node)
  }

  return ordered
}

/** "Parallel #2" 를 이름과 순번으로 나눈다. 서버의 parseNodeTarget 과 같은 표기를 쓴다. */
export function parseFlowTarget(target: string): { name: string; ordinal?: number } {
  const raw = String(target ?? '').trim()
  const matched = raw.match(/^(.*?)\s*#\s*(\d+)$/)
  if (!matched) return { name: raw }

  const name = String(matched[1] ?? '').trim()
  const ordinal = Number(matched[2])

  if (!name || !Number.isInteger(ordinal) || ordinal <= 0) return { name: raw }
  return { name, ordinal }
}

/** 같은 이름 노드들에 흐름 순서대로 1부터 번호를 매긴다. 이름이 하나뿐이면 번호를 주지 않는다. */
export function buildFlowOrdinals<T extends FlowNodeLike>(
  nodes: T[],
  edges: FlowEdgeLike[],
  labelOf: (node: T) => string,
): Map<string, number> {
  const ordered = orderNodesByFlow(nodes, edges)
  const seen = new Map<string, number>()
  const ordinalByNodeId = new Map<string, number>()
  const totalByLabel = new Map<string, number>()

  for (const node of ordered) {
    const label = labelOf(node)
    if (!label) continue
    totalByLabel.set(label, (totalByLabel.get(label) ?? 0) + 1)
  }

  for (const node of ordered) {
    const label = labelOf(node)
    if (!label || (totalByLabel.get(label) ?? 0) < 2) continue

    const next = (seen.get(label) ?? 0) + 1
    seen.set(label, next)
    ordinalByNodeId.set(String(node.id), next)
  }

  return ordinalByNodeId
}

/** 이름이 같은 후보들 중 흐름 순서 N 번째를 고른다. 범위를 벗어나면 null. */
export function pickByFlowOrdinal<T extends FlowNodeLike>(
  candidates: T[],
  ordinal: number,
  nodes: T[],
  edges: FlowEdgeLike[],
): T | null {
  if (candidates.length === 0) return null

  const candidateIds = new Set(candidates.map((node) => String(node.id)))
  const ordered = orderNodesByFlow(nodes, edges).filter((node) => candidateIds.has(String(node.id)))

  return ordered[ordinal - 1] ?? null
}
