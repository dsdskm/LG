/** IfThenElse 자식의 역할(condition / success / failure) 계산.
 * 역할은 자식 노드의 캔버스 위치 순서로 정해진다(기본 모드는 위->아래, tree 모드는 왼쪽->오른쪽).
 * bt/rules/rule_ifthenelse.ts 가 BT 를 만들 때 쓰는 정렬 기준과 같아야 한다.
 *
 * 수동으로 엣지를 이을 때(onConnect)와 자연어로 구성할 때가 같은 결과를 내도록 이 모듈을 공유한다.
 */

export const IF_THEN_ELSE_BRANCH_ORDER = ['condition', 'success', 'failure'] as const
export type IfThenElseBranchRole = (typeof IF_THEN_ELSE_BRANCH_ORDER)[number]

type RoleNode = {
  id: string | number
  position?: { x?: number; y?: number }
  data?: Record<string, any>
}

type RoleEdge = {
  source?: string | number
  target?: string | number
  sourceHandle?: string | null
}

function normalizeTaskName(value?: string | null): string {
  return String(value ?? '')
    .trim()
    .toLowerCase()
    .replace(/[_\s]+/g, ' ')
    .replace(/\s+/g, ' ')
}

export function isIfThenElseTaskNode(node: RoleNode | undefined | null): boolean {
  if (!node) return false

  const taskType = String(node.data?.taskType ?? '').toUpperCase()
  const taskName = normalizeTaskName(node.data?.taskName ?? node.data?.label ?? node.data?.name)

  return taskType === 'CONTROL' && (taskName === 'ifthenelse' || taskName === 'if then else' || taskName === 'if_then_else')
}

/** 이미 지정된 역할은 유지하고, 역할이 없는 자식에게 위치 순서대로 남은 역할을 채운다. */
export function resolveIfThenElseBranchRoles(
  parentNodeId: string,
  nodes: RoleNode[],
  edges: RoleEdge[],
  flowMode: 'default' | 'tree',
): Record<string, string> | null {
  const parentNode = nodes.find((node) => String(node.id) === String(parentNodeId))
  if (!parentNode || !isIfThenElseTaskNode(parentNode)) return null

  const validRoleSet = new Set<string>(IF_THEN_ELSE_BRANCH_ORDER)

  const currentRoles: Record<string, string> = {}
  const raw = (parentNode.data?.properties as Record<string, any> | undefined)?.ifthenelse_branch_roles
  if (raw && typeof raw === 'object') {
    for (const [targetId, role] of Object.entries(raw)) {
      const normalized = typeof role === 'string' ? role.trim().toLowerCase() : ''
      if (normalized && validRoleSet.has(normalized)) currentRoles[String(targetId)] = normalized
    }
  }

  const sortedLeftChildren = Array.from(
    new Set(
      edges
        .filter((edge) => String(edge.source) === String(parentNodeId) && String(edge.sourceHandle ?? '') === 'left')
        .map((edge) => String(edge.target)),
    ),
  )
    .map((targetId) => nodes.find((node) => String(node.id) === targetId))
    .filter((node): node is RoleNode => Boolean(node))
    .sort((a, b) => {
      const aPos = { x: Number(a.position?.x ?? 0), y: Number(a.position?.y ?? 0) }
      const bPos = { x: Number(b.position?.x ?? 0), y: Number(b.position?.y ?? 0) }

      if (flowMode === 'tree') return aPos.x - bPos.x || aPos.y - bPos.y
      return aPos.y - bPos.y || aPos.x - bPos.x
    })
    .map((node) => String(node.id))

  const nextRoles: Record<string, string> = { ...currentRoles }
  const usedRoles = new Set(Object.values(nextRoles))
  const missingRoles = IF_THEN_ELSE_BRANCH_ORDER.filter((role) => !usedRoles.has(role))

  for (const targetId of sortedLeftChildren) {
    if (nextRoles[targetId]) continue
    const nextRole = missingRoles.shift()
    if (nextRole) nextRoles[targetId] = nextRole
  }

  return Object.keys(nextRoles).length > 0 ? nextRoles : null
}

/** 흐름 전체를 훑어 모든 IfThenElse 노드의 역할을 채운 nodes 를 돌려준다.
 * 자연어로 만든 결과에도 수동 연결과 같은 역할이 붙게 한다.
 */
export function applyIfThenElseBranchRoles<T extends RoleNode>(
  nodes: T[],
  edges: RoleEdge[],
  flowMode: 'default' | 'tree' = 'default',
): T[] {
  let changed = false

  const next = nodes.map((node) => {
    if (!isIfThenElseTaskNode(node)) return node

    const roles = resolveIfThenElseBranchRoles(String(node.id), nodes, edges, flowMode)
    if (!roles) return node

    const previousProperties = (node.data?.properties ?? {}) as Record<string, unknown>
    const previousRoles = previousProperties.ifthenelse_branch_roles
    if (JSON.stringify(previousRoles ?? null) === JSON.stringify(roles)) return node

    changed = true
    return {
      ...node,
      data: {
        ...(node.data ?? {}),
        properties: { ...previousProperties, ifthenelse_branch_roles: roles },
      },
    }
  })

  return changed ? next : nodes
}
