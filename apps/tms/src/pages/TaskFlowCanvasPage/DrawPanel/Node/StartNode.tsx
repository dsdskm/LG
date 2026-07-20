import type { NodeProps } from '@xyflow/react'

import {
  StartNodeRoot,
  NodeHandle,
  StartH,
  StartBadgeRow,
  RootBadge,
  StartTitle
} from './styles.node'
import type { RFStartNode } from '../types'
import { useFlowEditorStore } from '@/store/taskflow.canvas.store'
import { getHandlePositions } from '@/utils/node.util'

type Props = NodeProps<RFStartNode>

export default function StartNode({ data, selected }: Props) {
  const title = data?.label?.trim() ? data.label : 'START'

  // 핸들 ID 는 그대로, 모드에 따라 위치만 변경 (BT 생성 동일)
  const flowMode = useFlowEditorStore((s) => s.flowMode)
  const pos = getHandlePositions(flowMode)

  return (
    <StartNodeRoot $selected={selected}>
      <NodeHandle type="source" position={pos.right} id={StartH.right} />

      <StartBadgeRow>
        <RootBadge>ROOT</RootBadge>
      </StartBadgeRow>

      <StartTitle>{title}</StartTitle>
    </StartNodeRoot>
  )
}
