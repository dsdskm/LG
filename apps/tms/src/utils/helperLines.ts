import type { Node, XYPosition } from '@xyflow/react'

/**
 * 노드 드래그 중 정렬 보조(헬퍼 라인 + 스냅).
 * 드래그 중인 노드의 가장자리/중앙이 다른 노드의 가장자리/중앙과 distance 이내로 가까우면
 * 그 위치로 스냅하고, 가이드선을 그릴 좌표(flow 기준)를 돌려준다.
 */
export type HelperLineResult = {
  // 가이드선 좌표 (flow 좌표계)
  vertical?: number
  horizontal?: number
  // 스냅된 위치 (없으면 미스냅)
  snapX?: number
  snapY?: number
}

function dim(node: Node, key: 'width' | 'height'): number {
  return Number((node as any).measured?.[key] ?? (node as any)[key] ?? 0)
}

export function getHelperLines(
  position: XYPosition,
  nodeId: string,
  nodes: Node[],
  distance = 5
): HelperLineResult {
  const nodeA = nodes.find((n) => n.id === nodeId)
  if (!nodeA) return {}

  const wA = dim(nodeA, 'width')
  const hA = dim(nodeA, 'height')

  const A = {
    left: position.x,
    right: position.x + wA,
    top: position.y,
    bottom: position.y + hA,
    centerX: position.x + wA / 2,
    centerY: position.y + hA / 2
  }

  const result: HelperLineResult = {}
  let vDist = distance
  let hDist = distance

  for (const nodeB of nodes) {
    if (nodeB.id === nodeId) continue

    const wB = dim(nodeB, 'width')
    const hB = dim(nodeB, 'height')
    const B = {
      left: nodeB.position.x,
      right: nodeB.position.x + wB,
      top: nodeB.position.y,
      bottom: nodeB.position.y + hB,
      centerX: nodeB.position.x + wB / 2,
      centerY: nodeB.position.y + hB / 2
    }

    // 세로 가이드선(x축 정렬): [거리, 스냅될 x, 가이드선 x]
    const vChecks: Array<[number, number, number]> = [
      [Math.abs(A.left - B.left), B.left, B.left],
      [Math.abs(A.right - B.right), B.right - wA, B.right],
      [Math.abs(A.left - B.right), B.right, B.right],
      [Math.abs(A.right - B.left), B.left - wA, B.left],
      [Math.abs(A.centerX - B.centerX), B.centerX - wA / 2, B.centerX]
    ]
    for (const [d, snapX, guideX] of vChecks) {
      if (d < vDist) {
        vDist = d
        result.snapX = snapX
        result.vertical = guideX
      }
    }

    // 가로 가이드선(y축 정렬): [거리, 스냅될 y, 가이드선 y]
    const hChecks: Array<[number, number, number]> = [
      [Math.abs(A.top - B.top), B.top, B.top],
      [Math.abs(A.bottom - B.bottom), B.bottom - hA, B.bottom],
      [Math.abs(A.top - B.bottom), B.bottom, B.bottom],
      [Math.abs(A.bottom - B.top), B.top - hA, B.top],
      [Math.abs(A.centerY - B.centerY), B.centerY - hA / 2, B.centerY]
    ]
    for (const [d, snapY, guideY] of hChecks) {
      if (d < hDist) {
        hDist = d
        result.snapY = snapY
        result.horizontal = guideY
      }
    }
  }

  return result
}

/**
 * 엣지 경유점(waypoint) 드래그 중 정렬 보조(헬퍼 라인 + 스냅).
 * 드래그 중인 점이 노드의 가장자리/중앙, 그리고 추가 기준점(엣지 끝점·다른 경유점)의
 * x/y 와 distance 이내로 가까우면 그 위치로 스냅하고, 가이드선 좌표(flow 기준)를 돌려준다.
 */
export function getWaypointHelperLines(
  point: XYPosition,
  nodes: Node[],
  extraX: number[] = [],
  extraY: number[] = [],
  distance = 5
): HelperLineResult {
  const xTargets = [...extraX]
  const yTargets = [...extraY]

  for (const node of nodes) {
    const w = dim(node, 'width')
    const h = dim(node, 'height')
    xTargets.push(node.position.x, node.position.x + w, node.position.x + w / 2)
    yTargets.push(node.position.y, node.position.y + h, node.position.y + h / 2)
  }

  const result: HelperLineResult = {}
  let vDist = distance
  let hDist = distance

  for (const x of xTargets) {
    const d = Math.abs(point.x - x)
    if (d < vDist) {
      vDist = d
      result.snapX = x
      result.vertical = x
    }
  }
  for (const y of yTargets) {
    const d = Math.abs(point.y - y)
    if (d < hDist) {
      hDist = d
      result.snapY = y
      result.horizontal = y
    }
  }

  return result
}
