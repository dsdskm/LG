import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { Checkbox } from '@repo/ui'

import { useFlowEditorStore } from '@/store/taskflow.canvas.store'
import { Card } from '../styles'
import { FieldLabel, FieldDesc, FieldBody } from './VisualDataSection/sections/styles.sections'

function isParallelNode(node: any): boolean {
  const data = node?.data ?? {}
  const taskType = String(data.taskType ?? '').toUpperCase()
  const name = String(data.taskName ?? data.label ?? data.name ?? '')
    .trim()
    .toLowerCase()
  return taskType === 'CONTROL' && name === 'parallel'
}

function getNodeLabel(node: any): string {
  const data = node?.data ?? {}
  return String(data.label ?? data.taskName ?? data.name ?? node?.id ?? '')
}

function getNodeTaskName(node: any): string {
  const data = node?.data ?? {}
  return String(data.taskName ?? data.name ?? '').trim() || 'UNKNOWN'
}

/**
 * Parallel 노드 선택 시, 좌측(분기)으로 연결된 자식 노드들을 나열하고
 * 그 중 main 노드를 다중 선택한다. 선택값은 properties.main_nodes(string[])로 저장된다.
 * main 에 포함되지 않은 노드는 BT 변환 시 항상 SUCCESS 처리되며,
 * success_count/failure_count 는 main 노드들의 결과로만 판정된다.
 */
type Props = {
  readOnly?: boolean
}

export default function ParallelMainNodesSection({ readOnly = false }: Props) {
  const { t } = useTranslation('tms')

  const nodes = useFlowEditorStore((s) => s.nodes)
  const edges = useFlowEditorStore((s) => s.edges)
  const selectedNodeId = useFlowEditorStore((s) => s.selectedNodeId)
  const updateSelectedNodeProps = useFlowEditorStore((s) => s.updateSelectedNodeProps)

  const selectedNode = useMemo(
    () => (selectedNodeId ? nodes.find((n) => n.id === selectedNodeId) ?? null : null),
    [nodes, selectedNodeId]
  )

  // 좌측(sourceHandle='left') 으로 나가 연결된 자식 노드들
  const childNodes = useMemo(() => {
    if (!selectedNode) return []
    const childIds = edges
      .filter((e) => e.source === selectedNode.id && (e as any).sourceHandle === 'left')
      .map((e) => String(e.target))

    const seen = new Set<string>()
    const result: any[] = []
    for (const id of childIds) {
      if (seen.has(id)) continue
      seen.add(id)
      const node = nodes.find((n) => n.id === id)
      if (node) result.push(node)
    }
    return result
  }, [selectedNode, edges, nodes])

  // main_nodes 가 배열로 저장되어 있으면 "명시적으로 선택됨"(빈 배열=0개 선택).
  // 미설정(undefined)이면 전체를 main 으로 간주(BT 변환 기본 동작)해 모두 체크 상태로 표시한다.
  const { isExplicit, mainNodes } = useMemo(() => {
    const raw = (selectedNode?.data as any)?.properties?.main_nodes
    return {
      isExplicit: Array.isArray(raw),
      mainNodes: Array.isArray(raw) ? raw.map((v: any) => String(v)) : []
    }
  }, [selectedNode])

  if (!selectedNode || !isParallelNode(selectedNode)) return null

  const isMain = (id: string) => (isExplicit ? mainNodes.includes(id) : true)

  const toggle = (id: string) => {
    if (readOnly) return
    const base = isExplicit ? mainNodes : childNodes.map((n) => String(n.id))
    const next = base.includes(id) ? base.filter((x) => x !== id) : [...base, id]
    updateSelectedNodeProps({ main_nodes: next })
  }

  return (
    <Card>
      <FieldLabel>{t('canvas.property.mainNodes')}</FieldLabel>
      <FieldDesc>{t('canvas.property.mainNodesDesc')}</FieldDesc>
      <FieldBody>
        {childNodes.length === 0 ? (
          <div style={{ fontSize: 12, color: '#94a3b8' }}>{t('canvas.property.mainNodesEmpty')}</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, fontSize: 13 }}>
            {childNodes.map((node) => (
              <Checkbox
                key={node.id}
                label={`${getNodeLabel(node)} (Task Name: ${getNodeTaskName(node)})`}
                checked={isMain(String(node.id))}
                disabled={readOnly}
                onChange={() => toggle(String(node.id))}
              />
            ))}
          </div>
        )}
      </FieldBody>
    </Card>
  )
}
