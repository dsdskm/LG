import { listTmsRuleList } from '../../../api/tms.api.js'

function toDescription(item) {
  return String(item?.description ?? item?.display ?? item?.summary ?? '').trim() || '설명 없음'
}

function toExamples(item) {
  const value = item?.example ?? item?.examples
  if (Array.isArray(value)) {
    return value.map((entry) => String(entry ?? '').trim()).filter(Boolean)
  }

  const single = String(value ?? '').trim()
  return single ? [single] : []
}

function toScreenSectionTitle(screenKey) {
  const key = String(screenKey || '').trim()
  if (key === 'tms') return 'TMS 앱에서 쓸 수 있는 명령어'
  if (key === 'tms/taskflows/:taskFlowId/canvas') return 'Canvas 화면에서 쓸 수 있는 명령어'
  return `${key || '현재'} 화면에서 쓸 수 있는 명령어`
}

export async function executeTmsHelp(context = {}) {
  const { rule } = context
  const notFoundText = rule?.fallbackText
  const headerText = String(rule?.replyText ?? '').trim()
  const screenKey = String(context.screenKey ?? '').trim() || undefined

  try {
    const items = await listTmsRuleList({ screenKey })
    if (!Array.isArray(items) || items.length <= 0) {
      return notFoundText || '조회 가능한 TMS 규칙이 없습니다.'
    }

    const screenGroups = new Map()
    for (const item of items) {
      const description = toDescription(item)
      const examples = toExamples(item)
      if (examples.length <= 0) continue

      const itemScreenKey = String(item?.screenKey || '').trim() || 'tms'
      const lines = screenGroups.get(itemScreenKey) || []
      for (const example of examples) {
        lines.push(`${example} : ${description}`)
      }
      screenGroups.set(itemScreenKey, lines)
    }

    if (screenGroups.size <= 0) {
      return notFoundText || '표시할 수 있는 example 규칙이 없습니다.'
    }

    const sections = []
    for (const [itemScreenKey, lines] of screenGroups) {
      sections.push(`### ${toScreenSectionTitle(itemScreenKey)}\n${lines.join('\n')}`)
    }

    const body = sections.join('\n\n')
    return headerText ? `${headerText}\n${body}` : body
  } catch (e) {
    return notFoundText
  }
}
