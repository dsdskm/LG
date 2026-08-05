import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'react-toastify'
import { Button } from '@repo/ui'
import {
  ReactFlow,
  ReactFlowProvider,
  Background,
  Controls,
  MiniMap,
  useUpdateNodeInternals,
  type ReactFlowInstance,
  type OnInit,
  type Connection,
  type NodeTypes,
  type EdgeTypes,
  ConnectionMode,
  ConnectionLineType,
  MarkerType,
  SelectionMode
} from '@xyflow/react'

import TaskEdge from './Edge/TaskEdge'
import TaskNode from './Node/TaskNode'
import StartNode from './Node/StartNode'
import HelperLines from './HelperLines'
import { CanvasWrapper, FlowFill, PanelRoot, AlignOverlay, NodeActionOverlay } from './styles'
import ConfirmModal from '@/pages/components/modal/ConfirmModal'
import { countEditableSelectedNodes, useFlowEditorStore } from '@/store/taskflow.canvas.store'
import type { ConnectDenyReason, RFEdge } from '@/store/taskflow.canvas.store'
import { PaletteItem } from '@/types/palette'

const DND_MIME = 'application/x-taskflow-palette'

const nodeTypes: NodeTypes = { taskNode: TaskNode, startNode: StartNode }
const edgeTypes: EdgeTypes = { taskEdge: TaskEdge }

function InnerCanvas() {
  const { t } = useTranslation(['tms', 'common'])
  const wrapperRef = useRef<HTMLDivElement | null>(null)
  const rfRef = useRef<ReactFlowInstance<any, any> | null>(null)
  const didRestoreViewportRef = useRef(false)

  const [selectedNodeCount, setSelectedNodeCount] = useState(0)
  const [showAlignGuideModal, setShowAlignGuideModal] = useState(false)

  const nodes = useFlowEditorStore((s) => s.nodes)
  const edges = useFlowEditorStore((s) => s.edges)
  const viewport = useFlowEditorStore((s) => s.viewport)
  const setViewport = useFlowEditorStore((s) => s.setViewport)

  const addNodeFromPalette = useFlowEditorStore((s) => s.addNodeFromPalette)
  const addControlNodeFromTask = useFlowEditorStore((s) => s.addControlNodeFromTask)

  const selectedNodeId = useFlowEditorStore((s) => s.selectedNodeId)
  const selectedEdgeId = useFlowEditorStore((s) => s.selectedEdgeId)

  const selectNode = useFlowEditorStore((s) => s.selectNode)
  const selectEdge = useFlowEditorStore((s) => s.selectEdge)

  const applyNodesChange = useFlowEditorStore((s) => s.applyNodesChange)
  const applyEdgesChange = useFlowEditorStore((s) => s.applyEdgesChange)
  const connectEdge = useFlowEditorStore((s) => s.connectEdge)
  const reconnectEdge = useFlowEditorStore((s) => s.reconnectEdge)

  const openDeleteConfirm = useFlowEditorStore((s) => s.openDeleteConfirm)
  const openDeleteEdgeConfirm = useFlowEditorStore((s) => s.openDeleteEdgeConfirm)

  const duplicateSelectedNodes = useFlowEditorStore((s) => s.duplicateSelectedNodes)

  // 단일 선택 + 그룹 선택을 합친 편집 대상 개수 (START 제외)
  const editableSelectedCount = useFlowEditorStore(countEditableSelectedNodes)
  const hasEditableSelection = editableSelectedCount > 0

  const alignSelectedNodesAuto = useFlowEditorStore((s) => s.alignSelectedNodesAuto)

  const flowMode = useFlowEditorStore((s) => s.flowMode)
  const setFlowMode = useFlowEditorStore((s) => s.setFlowMode)
  const updateNodeInternals = useUpdateNodeInternals()
  const modeInitRef = useRef(true)

  const helperLineVertical = useFlowEditorStore((s) => s.helperLineVertical)
  const helperLineHorizontal = useFlowEditorStore((s) => s.helperLineHorizontal)

  const canAlign = selectedNodeCount >= 2

  // 모드가 "전환"되면 핸들의 시각적 위치가 달라지므로 ReactFlow 내부 핸들 좌표를 갱신하고,
  // 재배치된 노드가 화면에 들어오도록 fitView 한다.
  // (초기 마운트 시에는 노드가 이미 올바른 핸들 위치로 마운트되고, viewport 복원과 충돌하므로 건너뛴다)
  useEffect(() => {
    if (modeInitRef.current) {
      modeInitRef.current = false
      return
    }

    const ids = useFlowEditorStore.getState().nodes.map((n) => n.id)
    ids.forEach((id) => updateNodeInternals(id))

    requestAnimationFrame(() => {
      rfRef.current?.fitView({ padding: 0.15, duration: 250 })

      requestAnimationFrame(() => {
        const vp = rfRef.current?.getViewport()
        if (vp) setViewport(vp)
      })
    })
  }, [flowMode, updateNodeInternals, setViewport])

  // 트리 모드에서는 들어오는 엣지 종류(주흐름 vs OR 분기)에 따라 노드 입력 핸들 위치가 달라지므로,
  // 엣지가 추가/삭제되면 해당 노드들의 핸들 좌표를 다시 계산해 엣지가 올바른 위치에 붙도록 한다.
  useEffect(() => {
    if (flowMode !== 'tree') return
    useFlowEditorStore.getState().nodes.forEach((n) => updateNodeInternals(n.id))
  }, [edges, flowMode, updateNodeInternals])

  const onInit: OnInit<any, any> = useCallback(
    (instance) => {
      rfRef.current = instance
      const currentViewport = instance.getViewport()
      setViewport(currentViewport)
    },
    [setViewport]
  )

  const onDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
  }, [])

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()

      const raw = e.dataTransfer.getData(DND_MIME)
      if (!raw) return

      const wrapper = wrapperRef.current
      const instance = rfRef.current
      if (!wrapper || !instance) return

      const position = instance.screenToFlowPosition({
        x: e.clientX,
        y: e.clientY
      })

      let item: PaletteItem
      try {
        item = JSON.parse(raw) as PaletteItem
      } catch {
        return
      }

      if (item.kind === 'contentNode') {
        addNodeFromPalette(item, position)
      }

      if (item.kind === 'controlTaskNode') {
        addControlNodeFromTask(item.task, position)
      }
    },
    [addNodeFromPalette, addControlNodeFromTask]
  )

  // 연결/재연결 실패 사유를 잠깐 떴다 사라지는 토스트로 안내한다.
  const notifyConnectDeny = useCallback(
    (denyReason: ConnectDenyReason) => {
      const messageKey =
        denyReason === 'control-bottom'
          ? 'canvas.edge.connect.denyControlBottom'
          : denyReason === 'left-not-control'
            ? 'canvas.edge.connect.denyLeftNotControl'
            : denyReason === 'target-not-left'
              ? 'canvas.edge.connect.denyTargetNotLeft'
              : 'canvas.edge.connect.denyDefault'

      toast.warning(t(messageKey))
    },
    [t]
  )

  const onConnect = useCallback(
    (c: Connection) => {
      const denyReason = connectEdge(c)
      if (denyReason) notifyConnectDeny(denyReason)
    },
    [connectEdge, notifyConnectDeny]
  )

  const onReconnect = useCallback(
    (oldEdge: RFEdge, newConnection: Connection) => {
      const denyReason = reconnectEdge(oldEdge, newConnection)
      if (denyReason) notifyConnectDeny(denyReason)
    },
    [reconnectEdge, notifyConnectDeny]
  )

  const onDuplicateClick = useCallback(() => {
    if (!hasEditableSelection) {
      toast.warning(t('canvas.nodeActions.duplicateEmpty'))
      return
    }

    duplicateSelectedNodes()
  }, [duplicateSelectedNodes, hasEditableSelection, t])

  const onDeleteClick = useCallback(() => {
    if (!hasEditableSelection) {
      toast.warning(t('canvas.nodeActions.deleteEmpty'))
      return
    }

    openDeleteConfirm()
  }, [hasEditableSelection, openDeleteConfirm, t])

  const onAlignClick = useCallback(() => {
    if (!canAlign) {
      setShowAlignGuideModal(true)
      return
    }

    alignSelectedNodesAuto()

    requestAnimationFrame(() => {
      rfRef.current?.fitView({ padding: 0.15, duration: 250 })

      requestAnimationFrame(() => {
        const vp = rfRef.current?.getViewport()
        if (vp) setViewport(vp)
      })
    })
  }, [alignSelectedNodesAuto, canAlign, setViewport])

  const renderedEdges = useMemo(() => {
    return edges.map((e) => {
      const isSelected = e.id === selectedEdgeId

      const baseStyle = {
        ...(e.style ?? {}),
        stroke: '#94a3b8',
        strokeWidth: 1.25,
        strokeLinecap: 'round' as const
      }

      const selectedStyle = {
        ...(e.style ?? {}),
        stroke: '#475569',
        strokeWidth: 2,
        strokeLinecap: 'round' as const
      }

      return {
        ...e,
        type: 'taskEdge',
        style: isSelected ? selectedStyle : baseStyle,
        markerEnd: {
          ...(e.markerEnd as any),
          color: isSelected ? '#475569' : '#94a3b8'
        }
      }
    })
  }, [edges, selectedEdgeId])

  useEffect(() => {
    const instance = rfRef.current
    if (!instance) return

    const hasCustomViewport =
      Number(viewport?.x ?? 0) !== 0 || Number(viewport?.y ?? 0) !== 0 || Number(viewport?.zoom ?? 1) !== 1

    if (!hasCustomViewport) {
      didRestoreViewportRef.current = false
      return
    }

    if (didRestoreViewportRef.current) return

    instance.setViewport(
      {
        x: viewport.x,
        y: viewport.y,
        zoom: viewport.zoom
      },
      { duration: 0 }
    )

    didRestoreViewportRef.current = true
  }, [viewport])

  return (
    <>
      <CanvasWrapper
        ref={wrapperRef}
        onDragOver={onDragOver}
        onDrop={onDrop}
        onDragOverCapture={(e) => e.preventDefault()}
        onDropCapture={(e) => e.preventDefault()}
        tabIndex={0}
        onKeyDownCapture={(e) => {
          // Ctrl/Cmd + D: 선택 노드(그룹 포함) 복제
          if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'd') {
            e.preventDefault()
            e.stopPropagation()
            onDuplicateClick()
            return
          }

          if (selectedEdgeId && (e.key === 'Delete' || e.key === 'Backspace')) {
            e.preventDefault()
            e.stopPropagation()
            openDeleteEdgeConfirm()
            return
          }

          // 그룹 선택은 selectedNodeId 가 비어 있을 수 있으므로 편집 대상 개수로 판단한다.
          if (hasEditableSelection && (e.key === 'Delete' || e.key === 'Backspace')) {
            e.preventDefault()
            e.stopPropagation()
            openDeleteConfirm()
          }
        }}
      >
        <AlignOverlay>
          <Button
            type="button"
            theme="light"
            size="sm"
            onClick={onAlignClick}
            aria-disabled={!canAlign}
            title={!canAlign ? t('canvas.align.selectAtLeastTwo') : t('canvas.align.alignSelected')}
          >
            {t('canvas.align.button')}
          </Button>

          <Button
            type="button"
            theme="light"
            size="sm"
            data-active={flowMode === 'default'}
            onClick={() => setFlowMode('default')}
            title={t('canvas.mode.switchToDefault')}
          >
            {t('canvas.mode.default')}
          </Button>

          <Button
            type="button"
            theme="light"
            size="sm"
            data-active={flowMode === 'tree'}
            onClick={() => setFlowMode('tree')}
            title={t('canvas.mode.switchToTree')}
          >
            {t('canvas.mode.tree')}
          </Button>
        </AlignOverlay>

        <NodeActionOverlay>
          <Button
            type="button"
            theme="light"
            size="sm"
            onClick={onDuplicateClick}
            aria-disabled={!hasEditableSelection}
            title={hasEditableSelection ? t('canvas.nodeActions.duplicateTitle') : t('canvas.nodeActions.duplicateEmpty')}
          >
            {editableSelectedCount > 1
              ? t('canvas.nodeActions.duplicateWithCount', { count: editableSelectedCount })
              : t('canvas.nodeActions.duplicate')}
          </Button>

          <Button
            type="button"
            theme="delete"
            size="sm"
            onClick={onDeleteClick}
            aria-disabled={!hasEditableSelection}
            title={hasEditableSelection ? t('canvas.nodeActions.deleteTitle') : t('canvas.nodeActions.deleteEmpty')}
          >
            {editableSelectedCount > 1
              ? t('canvas.nodeActions.deleteWithCount', { count: editableSelectedCount })
              : t('actions.delete')}
          </Button>
        </NodeActionOverlay>

        <FlowFill>
          <ReactFlow
            selectionMode={SelectionMode.Partial}
            selectionOnDrag
            // 드래그: 좌클릭 드래그는 박스 선택(그루핑), 휠(가운데) 버튼 드래그는 배경 이동(패닝)
            // ※ Ctrl+드래그 패닝은 React Flow(d3-zoom)가 ctrlKey 를 줌 전용으로 예약해 불가능
            panOnDrag={[1]}
            // 스크롤: 기본은 배경 이동, Ctrl 누르고 스크롤하면 확대/축소
            panOnScroll
            zoomOnScroll={false}
            zoomActivationKeyCode="Control"
            style={{ width: '100%', height: '100%' }}
            nodes={nodes}
            edges={renderedEdges}
            onInit={onInit}
            onNodesChange={applyNodesChange}
            onEdgesChange={applyEdgesChange}
            onConnect={onConnect}
            onReconnect={onReconnect}
            connectionMode={ConnectionMode.Loose}
            connectionLineType={ConnectionLineType.Bezier}
            nodeTypes={nodeTypes}
            edgeTypes={edgeTypes}
            defaultEdgeOptions={{
              type: 'taskEdge',
              markerEnd: {
                type: MarkerType.ArrowClosed,
                width: 10,
                height: 10,
                color: '#94a3b8'
              }
            }}
            onSelectionChange={({ nodes: selectedNodes }) => {
              setSelectedNodeCount(selectedNodes.length)
            }}
            onNodeClick={(evt, node) => {
              evt.stopPropagation()
              selectNode(node.id)
            }}
            onEdgeClick={(evt, edge) => {
              evt.stopPropagation()
              selectEdge(edge.id)
            }}
            onPaneClick={() => {
              selectNode(null)
              selectEdge(null)
              setSelectedNodeCount(0)
            }}
            onMoveEnd={() => {
              const instance = rfRef.current
              if (!instance) return

              const vp = instance.getViewport()
              setViewport(vp)
            }}
            fitView
            deleteKeyCode={null}
          >
            <Background />
            <MiniMap />
            <Controls />
            <HelperLines vertical={helperLineVertical} horizontal={helperLineHorizontal} />
          </ReactFlow>
        </FlowFill>
      </CanvasWrapper>

      <ConfirmModal
        open={showAlignGuideModal}
        title={t('canvas.align.guideTitle')}
        description={t('canvas.align.guideDesc')}
        showCancelButton={false}
        closeOnOverlayClick
        onCancel={() => setShowAlignGuideModal(false)}
        onConfirm={() => setShowAlignGuideModal(false)}
      />
    </>
  )
}

export default function DrawPanel() {
  return (
    <PanelRoot>
      <ReactFlowProvider>
        <InnerCanvas />
      </ReactFlowProvider>
    </PanelRoot>
  )
}
