/**
 * Common types shared across PropertyPanel
 */

export type PropertyDef = {
  type?: 'number' | 'boolean' | 'string' | 'content_reference'
  default?: unknown
  required?: boolean
  description?: string
  content_type?: string
}

export type PropertySchemaProperties = Record<string, PropertyDef>

export type PropertySchema = {
  properties?: PropertySchemaProperties
}

export type InfoTab = 'task' | 'content'

export type ViewMode = 'none' | 'node' | 'edge' | 'palette'