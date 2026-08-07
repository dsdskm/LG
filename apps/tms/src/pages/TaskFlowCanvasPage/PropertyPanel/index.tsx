import { useMemo, useState, type ChangeEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { Button } from '@repo/ui'

import { countEditableSelectedNodes, useFlowEditorStore, DEFAULT_EDGE_TYPE } from '../../../store/taskflow.canvas.store'
import type { EdgeVisualType } from '../../../store/taskflow.canvas.store'

import { InfoTab, ViewMode } from './types'

import {
  Card,
  CardTitle,
  CardTopLeft,
  CardTopRow,
  EmptyState,
  PanelHeader,
  PanelKicker,
  PanelRoot,
  Select,
  Stack
} from './styles'

const EDGE_TYPE_OPTIONS: EdgeVisualType[] = ['bezier', 'straight', 'step']
import NodeInfoSection from './components/VisualDataSection/sections/NodeInfoSection'
import ConfirmDeleteModal from '../components/ConfirmDeleteModal'

export default function PropertyPanel() {
  const { t } = useTranslation(['tms', 'common'])
  const [infoTab, setInfoTab] = useState<InfoTab>('task')

  const nodes = useFlowEditorStore((s) => s.nodes)
  const edges = useFlowEditorStore((s) => s.edges)

  const selectedNodeId = useFlowEditorStore((s) => s.selectedNodeId)
  const selectedEdgeId = useFlowEditorStore((s) => s.selectedEdgeId)
  const selectedPalette = useFlowEditorStore((s) => s.selectedPalette)
  const contentsList = useFlowEditorStore((s) => s.contentsList)

  const confirmDeleteOpen = useFlowEditorStore((s) => s.confirmDeleteOpen)
  const openDeleteConfirm = useFlowEditorStore((s) => s.openDeleteConfirm)
  const closeDeleteConfirm = useFlowEditorStore((s) => s.closeDeleteConfirm)
  const confirmDeleteSelectedNode = useFlowEditorStore((s) => s.confirmDeleteSelectedNode)

  const confirmDeleteEdgeOpen = useFlowEditorStore((s) => s.confirmDeleteEdgeOpen)
  const openDeleteEdgeConfirm = useFlowEditorStore((s) => s.openDeleteEdgeConfirm)
  const closeDeleteEdgeConfirm = useFlowEditorStore((s) => s.closeDeleteEdgeConfirm)
  const confirmDeleteSelectedEdge = useFlowEditorStore((s) => s.confirmDeleteSelectedEdge)

  const setSelectedEdgeType = useFlowEditorStore((s) => s.setSelectedEdgeType)

  // 그룹 선택 상태에서 삭제하면 여러 개가 지워지므로, 확인 문구에 개수를 노출한다.
  const deleteTargetCount = useFlowEditorStore(countEditableSelectedNodes)

  const selectedNode = useMemo(() => {
    if (!selectedNodeId) return null
    return nodes.find((node) => node.id === selectedNodeId) ?? null
  }, [nodes, selectedNodeId])

  const selectedEdge = useMemo(() => {
    if (!selectedEdgeId) return null
    return edges.find((edge) => edge.id === selectedEdgeId) ?? null
  }, [edges, selectedEdgeId])

  const selectedEdgeType: EdgeVisualType = selectedEdge?.data?.edgeType ?? DEFAULT_EDGE_TYPE

  const viewMode = useMemo<ViewMode>(() => {
    if (selectedEdge) return 'edge'
    if (selectedNode) return 'node'
    if (selectedPalette) return 'palette'
    return 'none'
  }, [selectedEdge, selectedNode, selectedPalette])

  /**
   * 실제 캔버스 노드를 선택한 경우:
   *   selectedNode.data 사용
   *
   * 팔레트 항목을 선택한 경우:
   *   selectedPalette 사용
   */
  const selectedData = useMemo(() => {
    const data = selectedNode?.data ?? selectedPalette ?? null
    if (!data) return null

    // 저장된 taskflow 에서 불러온 노드에는 contentValue 가 없을 수 있으므로
    // 로드된 contents 카탈로그(라이브 API 기준)에서 contentId 로 보완한다.
    if (data.contentId != null && !data.contentValue) {
      const catalog = contentsList.find((c) => c.id === data.contentId)
      if (catalog?.contentValue) {
        return { ...data, contentValue: catalog.contentValue }
      }
    }

    return data
  }, [selectedNode, selectedPalette, contentsList])

  const title = useMemo(() => {
    if (viewMode === 'edge') return t('canvas.property.edge')
    if (!selectedData) return ''
    return selectedData.taskName ?? selectedData.label ?? t('canvas.property.node')
  }, [viewMode, selectedData, t])

  // console.log(`selectedData`,selectedData)
  return (
    <PanelRoot>
      <PanelHeader>
        <PanelKicker>{t('canvas.property.kicker')}</PanelKicker>
      </PanelHeader>

      {viewMode === 'none' ? (
        <EmptyState>{t('canvas.property.empty')}</EmptyState>
      ) : (
        <Stack>
          <Card>
            <CardTopRow>
              <CardTopLeft>
                <CardTitle title={title}>{title}</CardTitle>
              </CardTopLeft>

              {viewMode === 'edge' && (
                <Button
                  type="button"
                  theme="delete"
                  size="sm"
                  onClick={openDeleteEdgeConfirm}
                  title={t('canvas.property.deleteEdgeTitle')}
                >
                  {t('actions.delete')}
                </Button>
              )}

              {viewMode === 'node' && (
                <Button
                  type="button"
                  theme="delete"
                  size="sm"
                  onClick={openDeleteConfirm}
                  title={t('canvas.property.deleteNodeTitle')}
                >
                  {t('actions.delete')}
                </Button>
              )}
            </CardTopRow>
          </Card>

          {viewMode === 'edge' && (
            <Card>
              <label htmlFor="edge-type-select" style={{ fontSize: 12, fontWeight: 600, color: '#64748b' }}>
                {t('canvas.edge.typeLabel')}
              </label>
              <Select
                id="edge-type-select"
                style={{ marginTop: 8 }}
                value={selectedEdgeType}
                onChange={(e: ChangeEvent<HTMLSelectElement>) =>
                  setSelectedEdgeType(e.target.value as EdgeVisualType)
                }
              >
                {EDGE_TYPE_OPTIONS.map((opt) => (
                  <option key={opt} value={opt}>
                    {t(`canvas.edge.types.${opt}`)}
                  </option>
                ))}
              </Select>
            </Card>
          )}

          {(viewMode === 'node' || viewMode === 'palette') && selectedData && (
            <NodeInfoSection
              viewMode={viewMode}
              selectedData={selectedData}
              infoTab={infoTab}
              setInfoTab={setInfoTab}
            />
          )}
        </Stack>
      )}

      <ConfirmDeleteModal
        open={confirmDeleteOpen}
        title={
          deleteTargetCount > 1
            ? t('canvas.confirmDelete.multiTitle', { count: deleteTargetCount })
            : undefined
        }
        onConfirm={confirmDeleteSelectedNode}
        onCancel={closeDeleteConfirm}
      />

      <ConfirmDeleteModal
        open={confirmDeleteEdgeOpen}
        title={t('canvas.property.confirmDeleteEdgeTitle')}
        onConfirm={confirmDeleteSelectedEdge}
        onCancel={closeDeleteEdgeConfirm}
      />
    </PanelRoot>
  )
}