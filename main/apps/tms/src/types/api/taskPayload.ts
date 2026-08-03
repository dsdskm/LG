export type PropertySchema = {
  properties?: Record<
    string,
    {
      type?: 'number' | 'boolean' | 'string' | 'content_reference'
      default?: any
      required?: boolean
      description?: string
      content_type?: string // 예: "POI", "SOUND"
    }
  >
}

export interface ContentApiPayload {
  contentTypeId: number
  contentTypeName: string
  contentValue: string
  contentVersion: string
  createdAt: string
  groupId: string | null
  id: number
  name: string
  siteId: string | null
  status: string
  updatedAt: string
  version: string
}

export interface TaskApiPayload {
  id: number
  groupId: string | null
  siteId: string | null
  taskType: string
  name: string
  propertySchema?: PropertySchema
  minExecVer: string
  version: string
  description?: string | null
  isDeployable: boolean
  status: string
  createdAt: string
  updatedAt: string

  // include=contents 일 때만 내려오는 확장 필드
  contents?: ContentApiPayload[]
}
