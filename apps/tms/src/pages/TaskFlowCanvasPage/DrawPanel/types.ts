/**
 * DrawPanel specific types for canvas nodes and edges
 */

import type { Node, Edge } from '@xyflow/react'
import { PropertySchema } from '../PropertyPanel/types'

/**
 * Data stored in canvas task nodes
 */
export type TaskNodeData = {
  label: string
  taskId: number
  taskName: string
  taskType: string
  contentId?: number
  contentName?: string
  contentTypeId?: number
  contentTypeName?: string
  contentVersion?: string
  taskStatus?: string
  runningCount?: number
  breakpoint?: boolean
  forcedResult?: 'SUCCESS' | 'FAILURE' | 'RUNNING'
  // 점검(inspect) 시 현재 RUNNING 노드에 몇 번째 tick째 실행 중인지 표시(같은 노드 반복 실행 인지용)
  tickCount?: number
  groupId?: string | null
  siteId?: string | null
  propertySchema?: PropertySchema
  properties: Record<string, any>
}

/**
 * React Flow task node type
 */
export type RFTaskNode = Node<TaskNodeData>

/**
 * Data stored in canvas start nodes
 */
export type StartNodeData = {
  label?: string
}

/**
 * React Flow start node type
 */
export type RFStartNode = Node<StartNodeData>
