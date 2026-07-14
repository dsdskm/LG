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
  groupId?: string | null
  siteId?: string | null

  propertySchema?: PropertySchema
  properties?: Record<string, any>
}

export type VisualDataSectionProps = {
  viewMode: ViewMode
  selectedData?: SelectedData
}
