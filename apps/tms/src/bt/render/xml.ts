export function attrsToString(attrs: Record<string, string>): string {
  const parts: string[] = []
  for (const [k, v] of Object.entries(attrs)) {
    const key = sanitizeXmlAttrName(k)
    if (!key) continue
    parts.push(`${key}="${escapeXmlAttr(String(v))}"`)
  }
  return parts.length ? ' ' + parts.join(' ') : ''
}

export function escapeXmlAttr(s: string): string {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

export function sanitizeXmlTagName(name: string): string {
  const trimmed = String(name ?? '').trim()
  if (!trimmed) return 'Action'
  let out = trimmed.replace(/[^a-zA-Z0-9_\-.:]/g, '_')
  if (/^[0-9]/.test(out)) out = '_' + out
  return out
}

export function sanitizeXmlAttrName(name: string): string {
  const trimmed = String(name ?? '').trim()
  if (!trimmed) return ''
  let out = trimmed.replace(/[^a-zA-Z0-9_\-.:]/g, '_')
  if (/^[0-9]/.test(out)) out = '_' + out
  return out
}

export function sanitizeXmlAttrValue(v: string): string {
  return String(v ?? '')
    .trim()
    .replace(/\s+/g, '_')
}

export function toSnakeCase(input: string): string {
  const s = String(input ?? '').trim()
  if (!s) return 'node'
  return s
    .replace(/([a-z0-9])([A-Z])/g, '$1_$2')
    .replace(/[\s\-]+/g, '_')
    .replace(/[^a-zA-Z0-9_]/g, '_')
    .replace(/_+/g, '_')
    .toLowerCase()
}
