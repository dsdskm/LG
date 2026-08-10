import type { PropertySchema, ViewMode } from '../../types'

export type SelectedData = {
  label?: string
  taskId?: number
  taskName?: string
  taskType?: string
  contentId?: number
  contentName?: string
  contentTypeId?: number
  contentTypeName?: string
  contentValue?: string
  contentVersion?: string
  groupId?: string | null
  siteId?: string | null

  propertySchema?: PropertySchema
  properties?: Record<string, any>
}

export type VisualDataSectionProps = {
  viewMode: ViewMode
  selectedData?: SelectedData
  /**
   * 선택된 노드 id. 콘텐츠 재생 진행바(PreviewProgress)의 store 키로 쓴다.
   * 팔레트 선택처럼 노드가 없는 경우에는 넘기지 않으며, 그때는 진행바를 표시하지 않는다.
   */
  nodeId?: string
}
