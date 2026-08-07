import type { NodeProps } from '@xyflow/react'
import type { ReactNode } from 'react'

import {
  TaskNodeRoot,
  NodeHandle,
  TaskH,
  TaskBadgeRow,
  TaskTitle,
  Pill as StyledPill,
  PillText,
  TaskRunningCountBadge,
  CircleBadge,
  MainNodeBadge,
  BreakpointDot,
  ForcedResultMark,
  TickCountBadge,
  execStyle
} from './styles.node'
import { RFTaskNode } from '../types'
import { useFlowEditorStore } from '@/store/taskflow.canvas.store'
import { getHandlePositions } from '@/utils/node.util'

type Props = NodeProps<RFTaskNode>

export default function TaskNode({ id, data, selected }: Props) {
  const isContentNode = typeof data?.contentId === 'number'

  const title = (data?.label ?? '').trim()
  const titleFontSize = fitTitleFontSize(title.length)
  const taskName = (data?.taskName ?? '').trim()

  // 핸들 ID 는 그대로 두고, 모드에 따라 시각적 위치만 바꾼다 (BT 생성은 동일)
  //  - 가로(default): 입력/분기출력=왼쪽, 주흐름 출력=오른쪽
  //  - 세로(tree)   : 입력/분기출력=위,   주흐름 출력=아래
  const flowMode = useFlowEditorStore((s) => s.flowMode)
  const pos = getHandlePositions(flowMode)

  // 부모 Parallel 노드의 main_nodes 에 포함된(=main) 노드인지 여부.
  // main_nodes 가 명시적으로 선택되지 않았으면 좌측 자식 전체를 main 으로 간주한다(패널과 동일).
  const isMainNode = useFlowEditorStore((s) =>
    s.edges.some((e) => {
      if (String(e.target) !== String(id) || (e.sourceHandle ?? '') !== 'left') return false
      const parent = s.nodes.find((n) => String(n.id) === String(e.source))
      if (!parent) return false
      const pData: any = parent.data ?? {}
      const isParallel =
        String(pData.taskType ?? '').toUpperCase() === 'CONTROL' &&
        String(pData.taskName ?? pData.label ?? pData.name ?? '')
          .trim()
          .toLowerCase() === 'parallel'
      if (!isParallel) return false
      const main = pData?.properties?.main_nodes
      // 배열로 저장되어 있으면 명시 선택(빈 배열=0개), 미설정이면 전체 main 으로 간주
      const isExplicit = Array.isArray(main)
      return !isExplicit || main.map((v: any) => String(v)).includes(String(id))
    })
  )

  return (
    <TaskNodeRoot
      $selected={selected}
      $taskType={data?.taskType}
      style={{
        background: execStyle[data.taskStatus ?? 'IDLE'].bg,
        borderColor: execStyle[data.taskStatus ?? 'IDLE'].border
      }}
    >
      {/* 주 흐름(true/next) 출력: 가로=오른쪽, 세로=아래 */}
      <NodeHandle type="source" position={pos.right} id={TaskH.right} isConnectableStart isConnectableEnd />

      {/* 단일 left 핸들이 입력 + 분기 출력을 겸한다: 가로=왼쪽, 세로=위 */}
      <NodeHandle type="source" position={pos.left} id={TaskH.left} isConnectableStart isConnectableEnd />

      <TaskBadgeRow>{isContentNode && taskName ? <Pill tone="name">{taskName}</Pill> : null}</TaskBadgeRow>
      <TaskRunningCountBadge>
        {(data?.runningCount ?? -1) > 0 ? (
          <Pill tone="name" dot={data.taskStatus === 'RUNNING'}>
            {data?.runningCount}
          </Pill>
        ) : null}
      </TaskRunningCountBadge>

      <TaskTitle style={{ color: execStyle[data.taskStatus ?? 'IDLE'].text, fontSize: titleFontSize, lineHeight: 1.4 }}>
        {title}
      </TaskTitle>

      {isMainNode && <MainNodeBadge>MAIN</MainNodeBadge>}

      {data?.breakpoint && <BreakpointDot />}
      {data?.forcedResult && <ForcedResultMark $result={data.forcedResult} />}
      {(data?.tickCount ?? 0) > 0 && <TickCountBadge>{data.tickCount}</TickCountBadge>}
    </TaskNodeRoot>
  )
}

// 노드 폭(78px)·2줄 클램프 기준으로, 이름이 길수록 폰트를 줄여 안 잘리게 맞춘다.
function fitTitleFontSize(len: number): number {
  if (len <= 12) return 10
  if (len <= 20) return 9
  if (len <= 30) return 8
  if (len <= 42) return 7
  return 6
}

function Pill({ children, tone, dot = false }: { children: ReactNode; tone: 'type' | 'name'; dot: boolean }) {
  const title = typeof children === 'string' ? children : undefined

  return (
    <StyledPill $tone={tone}>
      <PillText title={title}>{children}</PillText>
      {dot && <CircleBadge />}
    </StyledPill>
  )
}
