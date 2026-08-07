import type { Node } from '@xyflow/react'
import { sanitizeXmlAttrName, sanitizeXmlTagName, toSnakeCase } from '../render/xml'

export function resolveBtCppNodeInfo(n: Node): {
  tag: string
  nameAttr: string
  attrs: Record<string, string>
} {
  const data: any = (n as any).data ?? {}
  const payload: any = data.payload ?? undefined

  const label = String(data.label ?? data.name ?? payload?.contentName ?? payload?.taskName ?? n.id)

  const rawTag =
    data.btTag ??
    payload?.btTag ??
    data.taskName ??
    payload?.taskName ??
    data.contentName ??
    payload?.contentName ??
    label ??
    String(n.id)

  const tag = sanitizeXmlTagName(String(rawTag))

  const rawName =
    data.btName ??
    payload?.btName ??
    data.taskName ??
    payload?.taskName ??
    data.contentName ??
    payload?.contentName ??
    label ??
    String(n.id)

  const nameAttr = toSnakeCase(String(rawName))

  // attribute 의 "키"는 task 의 property schema 에 정의된 것만 사용하고,
  // "값"은 content value(JSON) 에서 해당 키의 값을 가져온다.
  const schemaProps = (data.propertySchema?.properties ?? payload?.propertySchema?.properties ?? {}) as Record<
    string,
    unknown
  >
  const schemaKeys = Object.keys(schemaProps)

  const contentValues = parseContentValue(data.contentValue ?? payload?.contentValue)

  const properties = {
    ...(data.properties ?? {}),
    ...(payload?.properties ?? {})
  } as Record<string, any>

  const attrs: Record<string, string> = {}

  for (const schemaKey of schemaKeys) {
    const key = sanitizeXmlAttrName(schemaKey)
    if (!key) continue

    // content value 에서 해당 키의 값을 찾고, 없으면 노드 속성값을 사용한다.
    const found = resolveContentValue(contentValues, schemaKey)
    const value = found !== undefined ? found : properties[schemaKey]

    attrs[key] = stringifyAttrValue(value)
  }

  // btAttrs 는 명시적 오버라이드로 그대로 유지한다.
  const btAttrs = (data.btAttrs ?? payload?.btAttrs ?? {}) as Record<string, any>
  for (const [k, v] of Object.entries(btAttrs)) {
    const key = sanitizeXmlAttrName(k)
    if (!key) continue
    if (v === undefined || v === null) continue
    attrs[key] = stringifyAttrValue(v)
  }

  return { tag, nameAttr, attrs }
}

// schema 키가 content value 의 최상위에 없고 중첩되어 있는 경우의 예외 매핑.
// (예: MoveTo 의 poi_id 는 content value 상 poi.poi_id 에 위치)
const CONTENT_VALUE_KEY_PATHS: Record<string, string> = {
  poi_id: 'poi.poi_id',
  face_id: 'id',
  sound_id: 'id',
  motion_id: 'id',
  tts_id: 'id',
  object_id: 'id'
}

// content value 에서 schema 키에 해당하는 값을 찾는다.
// 1) 최상위 키 직접 매칭 → 2) 예외 경로 매핑(dot path) → 없으면 undefined
function resolveContentValue(contentValues: Record<string, any> | null, schemaKey: string): unknown {
  if (!contentValues) return undefined

  if (schemaKey in contentValues) return contentValues[schemaKey]

  const path = CONTENT_VALUE_KEY_PATHS[schemaKey]
  if (path) return getByPath(contentValues, path)

  return undefined
}

function getByPath(obj: Record<string, any>, path: string): unknown {
  return path.split('.').reduce<any>((acc, seg) => {
    if (acc && typeof acc === 'object' && seg in acc) return acc[seg]
    return undefined
  }, obj)
}

// content_value 가 JSON object 문자열이면 파싱해서 반환, 아니면 null.
function parseContentValue(raw: unknown): Record<string, any> | null {
  if (raw && typeof raw === 'object') return raw as Record<string, any>
  if (typeof raw !== 'string') return null

  const trimmed = raw.trim()
  if (!trimmed || trimmed[0] !== '{') return null

  try {
    const parsed = JSON.parse(trimmed)
    return parsed && typeof parsed === 'object' ? parsed : null
  } catch {
    return null
  }
}

function stringifyAttrValue(value: unknown): string {
  if (value === undefined || value === null) return ''
  if (typeof value === 'object') return JSON.stringify(value)
  return String(value)
}
