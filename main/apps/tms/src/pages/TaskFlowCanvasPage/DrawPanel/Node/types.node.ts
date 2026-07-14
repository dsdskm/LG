/**
 * Node component specific shared types
 */

import type { NodeProps } from '@xyflow/react'

import type { RFStartNode, RFTaskNode } from '../types'

export type TaskNodeProps = NodeProps<RFTaskNode>
export type StartNodeProps = NodeProps<RFStartNode>