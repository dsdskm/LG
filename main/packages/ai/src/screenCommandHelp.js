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

function normalizeExamples(value) {
  if (Array.isArray(value)) {
    return value
      .map((item) => String(item ?? '').trim())
      .filter(Boolean)
  }

  if (typeof value === 'string') {
    return value
      .split(/[\n,]/)
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
    const directDescription = String(
      row?.description ?? row?.DESCRIPTION ?? row?.display ?? row?.DISPLAY ?? ''
    ).trim()
    const rowScreenAvailable = row?.screenAvailable !== undefined ? Boolean(row.screenAvailable) : true
    const aliases = normalizeAliases(
      row?.aliases ??
      payload.aliases ??
      payload.commands ??
      payload.keywords ??
      []
    )
    const examples = normalizeExamples(
      row?.example ??
      row?.examples ??
      payload.examples ??
      payload.example ??
      payload.examplesJson ??
      payload.exampleList ??
      []
    )
    const fallbackCommand = String(
      row?.command ??
      row?.ruleKey ??
      row?.rule_key ??
      payload.command ??
      payload.name ??
      payload.action ??
      ''
    ).trim()

    const resolvedDescription = (
      directDescription ||
      payload.description ||
      payload.display ||
      payload.help ||
      payload.summary ||
      payload.label ||
      '설명 없음'
    )

    const description = String(resolvedDescription).trim() || String(fallbackCommand || '설명 없음')

    const commandEntries = aliases.length > 0
      ? aliases.map((alias) => ({
          command: String(alias ?? '').trim(),
          description,
          display: description,
          aliases: [String(alias ?? '').trim()],
          examples,
        }))
      : [{
          command: fallbackCommand,
          description,
          display: description,
          aliases: [],
          examples,
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
        display: entry.display || description,
        aliases: entry.aliases || [],
        examples: entry.examples || examples || [],
        screenAvailable: rowScreenAvailable,
      })
    }
  }

  const withBuiltin = [
    {
      command: '/?',
      description: '현재 화면에서 사용할 수 있는 규칙 기반 명령을 보여줍니다.',
      display: '현재 화면에서 사용할 수 있는 규칙 기반 명령을 보여줍니다.',
      aliases: ['help', '도움말'],
      examples: ['/ ?', '/help'],
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
      const displayText = String(entry?.display ?? entry?.description ?? '').trim() || '설명 없음'
      const aliases = Array.isArray(entry?.aliases) ? entry.aliases.filter(Boolean) : []
      const exampleList = Array.isArray(entry?.examples) ? entry.examples.filter(Boolean) : []
      const aliasText = aliases.length > 0 ? ` [aliases: ${aliases.join(', ')}]` : ''
      const displayCommand = normalizedCommand || aliases[0] || 'command'
      lines.push(`- ${displayCommand}${aliasText} : ${displayText}`)
      for (const example of exampleList) {
        lines.push(`  example : ${example}`)
      }
    }
  }

  if (appOnlyEntries.length > 0) {
    lines.push('')
    lines.push('현재 화면에서는 사용할 수 없는 명령어(앱 전체 명령):')
    for (const entry of appOnlyEntries) {
      const normalizedCommand = String(entry?.command ?? '').trim()
      const displayText = String(entry?.display ?? entry?.description ?? '').trim() || '설명 없음'
      const aliases = Array.isArray(entry?.aliases) ? entry.aliases.filter(Boolean) : []
      const exampleList = Array.isArray(entry?.examples) ? entry.examples.filter(Boolean) : []
      const aliasText = aliases.length > 0 ? ` [aliases: ${aliases.join(', ')}]` : ''
      const displayCommand = normalizedCommand || aliases[0] || 'command'
      lines.push(`- ${displayCommand}${aliasText} : ${displayText} (현재 화면에서는 수행할 수 없습니다.)`)
      for (const example of exampleList) {
        lines.push(`  example : ${example}`)
      }
    }
  }

  if (currentScreenEntries.length === 0 && appOnlyEntries.length === 0) {
    lines.push('현재 화면에서 사용할 수 있는 규칙 기반 명령이 아직 없습니다.')
    lines.push('/? : 현재 화면의 명령 목록을 다시 확인합니다.')
  }

  return lines.join('\n')
}
