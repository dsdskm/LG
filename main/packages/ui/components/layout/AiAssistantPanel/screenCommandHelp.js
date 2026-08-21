export function isCommandHelpRequest(message) {
  const normalized = String(message ?? '').trim().replace(/\s+/g, ' ')

  if (!normalized) return false
  return (
    normalized === '/?' ||
    normalized === '?' ||
    normalized.toLowerCase() === '/help' ||
    normalized.toLowerCase() === 'help'
  )
}

function normalizeAliases(value) {
  if (Array.isArray(value)) {
    return value
      .map((item) => String(item ?? '').trim())
      .filter(Boolean)
  }

  if (typeof value === 'string') {
    return value
      .split(/[,|\n]/)
      .map((item) => item.trim())
      .filter(Boolean)
  }

  return []
}

export function extractCommandHelpEntries(rows = []) {
  const items = []
  const seen = new Set()

  for (const row of Array.isArray(rows) ? rows : []) {
    const payload = row && typeof row === 'object' ? (row.valueJson ?? row.value_json ?? row.value ?? {}) : {}
    const aliases = normalizeAliases(payload.aliases ?? payload.commands ?? payload.keywords)
    const fallbackCommand = String(
      payload.command ??
        payload.name ??
        payload.action ??
        row?.ruleKey ??
        row?.rule_key ??
        ''
    ).trim()

    console.info('[AI_CHAT][RULE_HELP_PARSE]', {
      rowKey: row?.ruleKey ?? row?.rule_key ?? '',
      rawValueJson: row?.valueJson ?? row?.value_json ?? row?.value ?? null,
      aliases,
      fallbackCommand,
      description: String(
        payload.description ??
          payload.help ??
          payload.summary ??
          payload.label ??
          '설명 없음'
      ).trim() || String(fallbackCommand || '설명 없음'),
    })

    const description = String(
      payload.description ??
        payload.help ??
        payload.summary ??
        payload.label ??
        '설명 없음'
    ).trim() || String(fallbackCommand || '설명 없음')

    const commandEntries = aliases.length > 0
      ? aliases.map((alias) => ({
          command: String(alias ?? '').trim(),
          description,
          aliases: [String(alias ?? '').trim()],
        }))
      : [{
          command: fallbackCommand,
          description,
          aliases: [],
        }]

    for (const entry of commandEntries) {
      const command = String(entry.command ?? '').trim()
      if (!command) continue

      const signature = `${command}::${description}`
      if (seen.has(signature)) continue
      seen.add(signature)

      items.push({
        command,
        description,
        aliases: entry.aliases || [],
      })
    }
  }

  const withBuiltin = [
    {
      command: '/?',
      description: '현재 화면에서 사용할 수 있는 규칙 기반 명령을 보여줍니다.',
      aliases: ['help', '도움말'],
    },
    ...items,
  ]

  const deduped = []
  const keySet = new Set()
  for (const item of withBuiltin) {
    const key = String(item.command ?? '').trim().toLowerCase()
    if (!key || keySet.has(key)) continue
    keySet.add(key)
    deduped.push(item)
  }

  return deduped
}

export function buildCommandHelpReplyText(entries = []) {
  const list = Array.isArray(entries) && entries.length > 0 ? entries : []

  if (list.length === 0) {
    return [
      '현재 화면에서 사용할 수 있는 규칙 기반 명령이 아직 없습니다.',
      '/? : 현재 화면의 명령 목록을 다시 확인합니다.',
    ].join('\n')
  }

  const currentScreenEntries = list.filter((entry) => entry?.screenAvailable !== false)
  const appOnlyEntries = list.filter((entry) => entry?.screenAvailable === false)
  const lines = []

  if (currentScreenEntries.length > 0) {
    lines.push('현재 화면에서 사용할 수 있는 명령어:')
    for (const entry of currentScreenEntries) {
      const normalizedCommand = String(entry?.command ?? '').trim()
      const description = String(entry?.description ?? '').trim() || '설명 없음'
      const aliases = Array.isArray(entry?.aliases) ? entry.aliases.filter(Boolean) : []
      const aliasText = aliases.length > 0 ? ` (${aliases.join(', ')})` : ''
      const displayCommand = normalizedCommand || aliases[0] || 'command'
      lines.push(`- ${displayCommand}${aliasText} : ${description}`)
    }
  }

  if (appOnlyEntries.length > 0) {
    lines.push('')
    lines.push('현재 화면에서는 사용할 수 없는 명령어(앱 전체 명령):')
    for (const entry of appOnlyEntries) {
      const normalizedCommand = String(entry?.command ?? '').trim()
      const description = String(entry?.description ?? '').trim() || '설명 없음'
      const aliases = Array.isArray(entry?.aliases) ? entry.aliases.filter(Boolean) : []
      const aliasText = aliases.length > 0 ? ` (${aliases.join(', ')})` : ''
      const displayCommand = normalizedCommand || aliases[0] || 'command'
      lines.push(`- ${displayCommand}${aliasText} : ${description} (현재 화면에서는 수행할 수 없습니다.)`)
    }
  }

  if (currentScreenEntries.length === 0 && appOnlyEntries.length === 0) {
    lines.push('현재 화면에서 사용할 수 있는 규칙 기반 명령이 아직 없습니다.')
    lines.push('/? : 현재 화면의 명령 목록을 다시 확인합니다.')
  }

  return lines.join('\n')
}
