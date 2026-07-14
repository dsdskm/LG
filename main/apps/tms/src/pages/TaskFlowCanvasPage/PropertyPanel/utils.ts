type AnyRecord = Record<string, any>

type GetSelectedContentDataParams = {
  viewMode: 'none' | 'palette' | 'node' | 'edge'
  selectedNode: any
  selectedPalette: any
  contentsList: any[]
}

export type SelectedContentData = {
  contentId: string | number | null
  contentTypeId: number | null
  contentName: string
  contentItem: AnyRecord | null
}

export function getEffectiveReadOnly({
  mode,
  readOnly,
  taskType
}: {
  mode: 'none' | 'palette' | 'node' | 'edge'
  readOnly: boolean
  taskType?: string
}) {
  if (mode === 'palette') return true
  if (String(taskType ?? '').toUpperCase() === 'ACTION') return true
  return readOnly
}

export function getSelectedContentData({
  viewMode,
  selectedNode,
  selectedPalette,
  contentsList: contentsList
}: GetSelectedContentDataParams): SelectedContentData {
  // Palette=>TaskPanel, Node=>DrawPanel
  if (viewMode === 'node' && selectedNode) {
    const nodeData = selectedNode.data ?? {}
    const contentId = nodeData.contentId ?? null
    const contentItem = selectedNode.data.contents
    const contentTypeId = nodeData.contentTypeId
    const contentName = nodeData.contentName

    return {
      contentId,
      contentTypeId,
      contentName,
      contentItem,
    }
  }

  if (viewMode === 'palette' && selectedPalette) {
    const task = selectedPalette.task ?? {}
    const taskType = String(task.taskType ?? '')

    if (selectedPalette.kind === 'contentNode') {
      const content = selectedPalette.content ?? null

      return {
        contentId: content?.id ?? null,
        contentTypeId: toNumberOrNull(content?.contentTypeId ?? content?.contentType?.id),
        contentName: String(content?.name ?? ''),
        contentItem: content,
        taskType
      }
    }

    return {
      contentId: null,
      contentTypeId: null,
      contentName: '',
      contentItem: null,
      taskType
    }
  }

  return {
    contentId: null,
    contentTypeId: null,
    contentName: '',
    contentItem: null,
    taskType: ''
  }
}
function toNumberOrNull(value: unknown) {
  if (value == null || value === '') return null

  const parsed = Number(value)
  return Number.isNaN(parsed) ? null : parsed
}
