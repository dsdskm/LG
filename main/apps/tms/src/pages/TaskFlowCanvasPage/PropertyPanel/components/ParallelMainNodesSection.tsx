import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { Checkbox } from '@repo/ui'

import { useFlowEditorStore } from '@/store/taskflow.canvas.store'
import { Card } from '../styles'
import {
  FieldLabel,
  FieldDesc,
  FieldBody
} from './VisualDataSection/sections/styles.sections'

function isParallelNode(node: any): boolean {
  const data = node?.data ?? {}
  const taskType = String(data.taskType ?? '').toUpperCase()
  const name = String(
    data.taskName ?? data.label ?? data.name ?? ''
  )
    .trim()
    .toLowerCase()

  return taskType === 'CONTROL' && name === 'parallel'
}

function getNodeLabel(node: any): string {
  const data = node?.data ?? {}
  return String(
    data.label ??
      data.taskName ??
      data.name ??
      node?.id ??
      ''
  )
}

type Props = {
  readOnly?: boolean
}

export default function ParallelMainNodesSection({
  readOnly = false
}: Props) {
  const { t } = useTranslation('tms')

  const nodes = useFlowEditorStore((s) => s.nodes)
  const edges = useFlowEditorStore((s) => s.edges)
  const selectedNodeId = useFlowEditorStore(
    (s) => s.selectedNodeId
  )
  const updateSelectedNodeProps = useFlowEditorStore(
    (s) => s.updateSelectedNodeProps
  )

  const selectedNode = useMemo(
    () =>
      selectedNodeId
        ? nodes.find((n) => n.id === selectedNodeId) ?? null
        : null,
    [nodes, selectedNodeId]
  )

  const childNodes = useMemo(() => {
    if (!selectedNode) return []

    const childIds = edges
      .filter(
        (e) =>
          e.source === selectedNode.id &&
          (e as any).sourceHandle === 'left'
      )
      .map((e) => String(e.target))

    const seen = new Set<string>()
    const result: any[] = []

    for (const id of childIds) {
      if (seen.has(id)) continue

      seen.add(id)

      const node = nodes.find((n) => n.id === id)
      if (node) {
        result.push(node)
      }
    }

    return result
  }, [selectedNode, edges, nodes])

  const mainNodes = useMemo(() => {
    const raw =
      (selectedNode?.data as any)?.properties?.main_nodes

    return Array.isArray(raw)
      ? raw.map((v: any) => String(v))
      : []
  }, [selectedNode])

  if (!selectedNode || !isParallelNode(selectedNode)) {
    return null
  }

  const isMain = (id: string) => {
    return mainNodes.includes(id)
  }

  const toggle = (id: string) => {
  if (readOnly) return

  const isRemoving = mainNodes.includes(id)

  const next = isRemoving
    ? mainNodes.filter((x) => x !== id)
    : [...mainNodes, id]

  const currentSuccess = Number(
    (selectedNode?.data as any)?.properties?.success_count ?? 0
  )

  const currentFailure = Number(
    (selectedNode?.data as any)?.properties?.failure_count ?? 0
  )

  const delta = isRemoving ? -1 : 1

  updateSelectedNodeProps({
    main_nodes: next,
    success_count: Math.max(0, currentSuccess + delta),
    failure_count: Math.max(0, currentFailure + delta)
  })
}

  return (
    <Card>
      <FieldLabel>
        {t('canvas.property.mainNodes')}
      </FieldLabel>

      <FieldDesc>
        {t('canvas.property.mainNodesDesc')}
      </FieldDesc>

      <FieldBody>
        {childNodes.length === 0 ? (
          <div
            style={{
              fontSize: 12,
              color: '#94a3b8'
            }}
          >
            {t('canvas.property.mainNodesEmpty')}
          </div>
        ) : (
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: 8,
              fontSize: 13
            }}
          >
            {childNodes.map((node) => (
              <Checkbox
                key={node.id}
                label={getNodeLabel(node)}
                checked={isMain(String(node.id))}
                disabled={readOnly}
                onChange={() =>
                  toggle(String(node.id))
                }
              />
            ))}
          </div>
        )}
      </FieldBody>
    </Card>
  )
}
