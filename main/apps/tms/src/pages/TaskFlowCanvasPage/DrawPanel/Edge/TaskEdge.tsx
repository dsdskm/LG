import { useEffect, useState, type PointerEvent as ReactPointerEvent, type MouseEvent as ReactMouseEvent } from 'react'
import {
  BaseEdge,
  EdgeLabelRenderer,
  getBezierPath,
  getStraightPath,
  getSmoothStepPath,
  Position,
  useReactFlow,
  type EdgeProps
} from '@xyflow/react'

import type { EdgeVisualType, EdgeWaypoint } from '@/store/taskflow.canvas.store'
import { DEFAULT_EDGE_TYPE, useFlowEditorStore } from '@/store/taskflow.canvas.store'
import { getWaypointHelperLines } from '@/utils/helperLines'

type Point = { x: number; y: number }

// source → ...waypoints → target 를 직선 구간으로 잇는 경로
function buildPolylinePath(points: Point[]): string {
  if (points.length === 0) return ''
  let d = `M ${points[0].x},${points[0].y}`
  for (let i = 1; i < points.length; i++) {
    d += ` L ${points[i].x},${points[i].y}`
  }
  return d
}

// source → ...waypoints → target 를 모든 점을 지나는 부드러운 곡선으로 잇는 경로.
// Catmull-Rom 스플라인을 cubic 베지어로 변환해 경유점에서 꺾이지 않고 불룩하게 휜다.
function buildSmoothPath(points: Point[]): string {
  if (points.length < 2) return buildPolylinePath(points)
  if (points.length === 2) {
    return `M ${points[0].x},${points[0].y} L ${points[1].x},${points[1].y}`
  }
  let d = `M ${points[0].x},${points[0].y}`
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[i - 1] ?? points[i]
    const p1 = points[i]
    const p2 = points[i + 1]
    const p3 = points[i + 2] ?? points[i + 1]
    const c1x = p1.x + (p2.x - p0.x) / 6
    const c1y = p1.y + (p2.y - p0.y) / 6
    const c2x = p2.x - (p3.x - p1.x) / 6
    const c2y = p2.y - (p3.y - p1.y) / 6
    d += ` C ${c1x},${c1y} ${c2x},${c2y} ${p2.x},${p2.y}`
  }
  return d
}

export default function TaskEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  data,
  style,
  markerEnd,
  selected
}: EdgeProps) {
  const edgeType = ((data as any)?.edgeType ?? DEFAULT_EDGE_TYPE) as EdgeVisualType
  const waypoints = ((data as any)?.waypoints ?? []) as EdgeWaypoint[]
  const hasWaypoints = waypoints.length > 0

  const { screenToFlowPosition } = useReactFlow()
  const setEdgeWaypoints = useFlowEditorStore((s) => s.setEdgeWaypoints)
  const setHelperLines = useFlowEditorStore((s) => s.setHelperLines)
  const pushHistoryCheckpoint = useFlowEditorStore((s) => s.pushHistoryCheckpoint)

  // 드래그 중인 경유점 인덱스 (null = 드래그 안 함)
  const [dragIndex, setDragIndex] = useState<number | null>(null)

  // 드래그 동안 window 레벨에서 이동/종료를 처리해 리렌더와 무관하게 안정적으로 동작시킨다.
  useEffect(() => {
    if (dragIndex === null) return

    const handleMove = (e: PointerEvent) => {
      const pos = screenToFlowPosition({ x: e.clientX, y: e.clientY })
      const current = (useFlowEditorStore.getState().edges.find((ed) => ed.id === id)?.data?.waypoints ?? []).slice()
      if (dragIndex < 0 || dragIndex >= current.length) return

      // 노드 정렬선 + 엣지 끝점 + 다른 경유점에 스냅 (노드 드래그와 동일한 보조 정렬)
      const nodes = useFlowEditorStore.getState().nodes
      const extraX = [sourceX, targetX]
      const extraY = [sourceY, targetY]
      current.forEach((wp, i) => {
        if (i === dragIndex) return
        extraX.push(wp.x)
        extraY.push(wp.y)
      })
      const helper = getWaypointHelperLines(pos, nodes, extraX, extraY)

      current[dragIndex] = {
        x: helper.snapX ?? pos.x,
        y: helper.snapY ?? pos.y
      }
      setEdgeWaypoints(id, current)
      setHelperLines(helper.vertical, helper.horizontal)
    }

    const handleUp = () => {
      setDragIndex(null)
      setHelperLines(undefined, undefined)
    }

    window.addEventListener('pointermove', handleMove)
    window.addEventListener('pointerup', handleUp)
    return () => {
      window.removeEventListener('pointermove', handleMove)
      window.removeEventListener('pointerup', handleUp)
    }
  }, [dragIndex, id, screenToFlowPosition, setEdgeWaypoints, setHelperLines, sourceX, sourceY, targetX, targetY])

  // ── 경로 계산 ──────────────────────────────────────────────
  let edgePath: string

  if (hasWaypoints) {
    const pathPoints = [{ x: sourceX, y: sourceY }, ...waypoints, { x: targetX, y: targetY }]
    // 곡선(bezier) 엣지는 경유점을 지나는 부드러운 곡선으로, 직선/스텝은 꺾인 선으로 그린다.
    edgePath = edgeType === 'bezier' ? buildSmoothPath(pathPoints) : buildPolylinePath(pathPoints)
  } else if (edgeType === 'straight') {
    ;[edgePath] = getStraightPath({ sourceX, sourceY, targetX, targetY })
  } else if (edgeType === 'step') {
    ;[edgePath] = getSmoothStepPath({
      sourceX,
      sourceY,
      targetX,
      targetY,
      sourcePosition,
      targetPosition,
      borderRadius: 8
    })
  } else if (sourcePosition === Position.Top && targetPosition === Position.Top) {
    // 곡선(bezier) + 위 → 위 (세로 모드 분기 엣지): 위 핸들에서 위로 나갔다가
    // 부드럽게 휘어 자식으로 들어가도록 곡률 있는 베지어를 사용한다.
    // (곡률 0 이면 바로 꺾여 보인다 — Left→Left 와 대칭)
    ;[edgePath] = getBezierPath({
      sourceX,
      sourceY,
      targetX,
      targetY,
      sourcePosition,
      targetPosition,
      curvature: 0.6
    })
  } else if (sourcePosition === Position.Left && targetPosition === Position.Left) {
    // 곡선(bezier) + 왼쪽 → 왼쪽: getBezierPath 가 x 차이에 비례해 휘므로(수직으로 겹치면 거의 직선)
    // 그냥 아래로 떨어져 보인다. 왼쪽으로 볼록하게 휘도록 커스텀 베지어를 사용한다.
    const dy = Math.abs(targetY - sourceY)
    const bulge = Math.min(15, Math.max(24, dy * 0.22))
    const leftX = Math.min(sourceX, targetX) - bulge
    edgePath = `M ${sourceX},${sourceY} C ${leftX},${sourceY} ${leftX},${targetY} ${targetX},${targetY}`
  } else {
    ;[edgePath] = getBezierPath({
      sourceX,
      sourceY,
      targetX,
      targetY,
      sourcePosition,
      targetPosition,
      curvature: 0
    })
  }

  // ── 드래그 핸들 ────────────────────────────────────────────
  const points: Point[] = [{ x: sourceX, y: sourceY }, ...waypoints, { x: targetX, y: targetY }]

  const beginMoveWaypoint = (index: number, e: ReactPointerEvent) => {
    e.stopPropagation()
    e.preventDefault()
    pushHistoryCheckpoint()
    setDragIndex(index)
  }

  // segIndex 번째 구간 중앙에 새 경유점을 삽입하고 바로 드래그를 시작한다.
  const beginAddWaypoint = (segIndex: number, mid: Point, e: ReactPointerEvent) => {
    e.stopPropagation()
    e.preventDefault()
    pushHistoryCheckpoint()
    const current = (useFlowEditorStore.getState().edges.find((ed) => ed.id === id)?.data?.waypoints ?? []).slice()
    current.splice(segIndex, 0, mid)
    setEdgeWaypoints(id, current)
    setDragIndex(segIndex)
  }

  const removeWaypoint = (index: number, e: ReactMouseEvent) => {
    e.stopPropagation()
    e.preventDefault()
    pushHistoryCheckpoint()
    const current = (useFlowEditorStore.getState().edges.find((ed) => ed.id === id)?.data?.waypoints ?? []).slice()
    current.splice(index, 1)
    setEdgeWaypoints(id, current)
  }

  return (
    <>
      <BaseEdge
        id={id}
        path={edgePath}
        style={{
          ...style,
          fill: 'none',
          strokeLinejoin: 'round'
        }}
        markerEnd={markerEnd}
      />

      {selected && (
        <EdgeLabelRenderer>
          {/* 구간 중앙의 추가 핸들: 드래그하면 새 경유점이 생성되며 함께 끌려간다 */}
          {points.slice(0, -1).map((p, segIndex) => {
            const next = points[segIndex + 1]
            const mid = { x: (p.x + next.x) / 2, y: (p.y + next.y) / 2 }
            return (
              <div
                key={`add-${segIndex}`}
                className="nodrag nopan"
                onPointerDown={(e) => beginAddWaypoint(segIndex, mid, e)}
                style={{
                  position: 'absolute',
                  transform: `translate(-50%, -50%) translate(${mid.x}px, ${mid.y}px)`,
                  width: 9,
                  height: 9,
                  borderRadius: '9999px',
                  background: '#ffffff',
                  border: '1px solid #94a3b8',
                  opacity: 0.6,
                  cursor: 'grab',
                  pointerEvents: 'all'
                }}
              />
            )
          })}

          {/* 기존 경유점 핸들: 드래그로 이동, 더블클릭으로 제거 */}
          {waypoints.map((wp, index) => (
            <div
              key={`wp-${index}`}
              className="nodrag nopan"
              onPointerDown={(e) => beginMoveWaypoint(index, e)}
              onDoubleClick={(e) => removeWaypoint(index, e)}
              style={{
                position: 'absolute',
                transform: `translate(-50%, -50%) translate(${wp.x}px, ${wp.y}px)`,
                width: 11,
                height: 11,
                borderRadius: '9999px',
                background: '#475569',
                border: '2px solid #ffffff',
                boxShadow: '0 0 0 1px #475569',
                cursor: 'grab',
                pointerEvents: 'all'
              }}
            />
          ))}
        </EdgeLabelRenderer>
      )}
    </>
  )
}
