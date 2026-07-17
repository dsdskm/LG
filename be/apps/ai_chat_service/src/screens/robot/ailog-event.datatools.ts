/**
 * robot > AI 로그 분석 > 이벤트 탭의 데이터 조회 tool.
 *
 * event_analyzer /query/logs 를 조회해 필터를 확정하고 요약을 만든다.
 * 조회에 사용한 필터(resolvedFilters)는 orchestrator 가 chat_action_param 으로
 * 프론트에 반환해 표를 동기화한다.
 */
import type { ToolContext, ToolDefinition } from '../../pipeline/tool.type'
import { fetchQueryLogs, fetchFuncs, type FuncCatalogItem } from '../../integrations/robot-api.client'
import { buildEventSummary } from '../../integrations/event-summary.util'
import {
  buildEventQueryCacheKey,
  getEventQueryCache,
  setEventQueryCache,
} from '../../db/event-query-cache.repo'
import { findPhraseMapMatch } from '../../db/query-phrase-map.repo'

const normKey = (s: unknown) => String(s ?? '').trim().toLowerCase().replace(/\s+/g, '')
const toObject = (value: unknown): Record<string, unknown> =>
  value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {}

/**
 * LLM이 넘긴 func 값을 기능 카탈로그로 정규화한다.
 *  - func 명 또는 tags(별칭)에 매칭되면 카탈로그의 대표 func 로 치환.
 *    (예: tags=['navi','navigation'] 인 func="주행" 에 대해 "navigation" → "주행")
 *  - 어떤 기능에도 매칭되지 않으면 실제 기능이 아니므로 keyword 검색으로 전환.
 */
async function resolveFuncFilter(
  ctx: ToolContext,
  funcArg?: string,
  keywordArg?: string,
  sourceTextArg?: string,
): Promise<{ func?: string; keyword?: string }> {
  const func = funcArg ? String(funcArg).trim() : undefined
  let keyword = keywordArg ? String(keywordArg) : undefined
  const sourceText = String(sourceTextArg ?? '').trim()
  const catalog = await fetchFuncs(ctx).catch((): FuncCatalogItem[] => [])

  const matchByToken = (token?: string) => {
    const target = normKey(token)
    if (!target) return undefined
    return catalog.find((f) => normKey(f.func) === target || f.tags.some((t) => normKey(t) === target))
  }

  const matchBySentence = (sentence?: string) => {
    const target = normKey(sentence)
    if (!target) return undefined

    return catalog.find((f) => {
      const func = normKey(f.func)
      if (func && target.includes(func)) return true
      return f.tags.some((t) => {
        const alias = normKey(t)
        return Boolean(alias) && target.includes(alias)
      })
    })
  }

  if (!func) {
    const matchedByKeyword = matchByToken(keyword)
    if (matchedByKeyword) {
      return { func: matchedByKeyword.func, keyword: undefined }
    }

    const matchedBySentence = matchBySentence(keyword) ?? matchBySentence(sourceText)
    if (matchedBySentence) {
      return { func: matchedBySentence.func, keyword: undefined }
    }

    return { func: undefined, keyword }
  }

  const matched = matchByToken(func)

  if (matched) return { func: matched.func, keyword }

  // 존재하지 않는 기능 → 키워드 검색으로 폴백.
  if (!keyword) keyword = func
  return { func: undefined, keyword }
}

const pad2 = (v: number) => String(v).padStart(2, '0')
const dateStr = (d: Date) => `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`
const today = () => dateStr(new Date())
const daysAgo = (n: number) => {
  const d = new Date()
  d.setDate(d.getDate() - n)
  return dateStr(d)
}

function daysBetween(start: string, end: string): number {
  const s = new Date(start)
  const e = new Date(end)
  if (Number.isNaN(s.getTime()) || Number.isNaN(e.getTime())) return 1
  const ms = Math.abs(e.getTime() - s.getTime())
  return Math.max(1, Math.floor(ms / (24 * 60 * 60 * 1000)) + 1)
}

function resolveQueryCacheTtlSeconds(start: string, end: string): number {
  const spanDays = daysBetween(start, end)
  if (spanDays <= 1) return 30
  if (spanDays <= 7) return 120
  if (spanDays <= 31) return 300
  return 600
}

function pickOptionalString(value: unknown): string | undefined {
  const s = String(value ?? '').trim()
  return s || undefined
}

function extractResolvedFilters(payload: any): {
  start: string
  end: string
  severity?: string
  func?: string
  status?: string
  keyword?: string
} | null {
  if (!payload || typeof payload !== 'object') return null

  const rf = toObject(payload.resolvedFilters)
  const start = pickOptionalString(rf.startDate)
  const end = pickOptionalString(rf.endDate)
  if (!start || !end) return null

  return {
    start,
    end,
    severity: pickOptionalString(rf.severity),
    func: pickOptionalString(rf.func),
    status: pickOptionalString(rf.status),
    keyword: pickOptionalString(rf.searchQuery),
  }
}

function isSeedPlaceholderPayload(payload: any): boolean {
  const summary = String(payload?.summary ?? '').toLowerCase()
  return summary.includes('(seed cache)')
}

function compactForMatch(value?: string): string {
  return String(value ?? '')
    .toLowerCase()
    .replace(/\s+/g, '')
    .replace(/[^\p{L}\p{N}]/gu, '')
}

function addDays(base: string, delta: number): string {
  const d = new Date(base)
  if (Number.isNaN(d.getTime())) return base
  d.setDate(d.getDate() + delta)
  return dateStr(d)
}

function minDate(a: string, b: string): string {
  return new Date(a).getTime() <= new Date(b).getTime() ? a : b
}

async function fetchQueryLogsWithChunking(
  ctx: ToolContext,
  params: {
    start: string
    end: string
    severity?: string
    func?: string
    status?: string
    keyword?: string
  },
): Promise<{ items: any[]; totalCount: number }> {
  const spanDays = daysBetween(params.start, params.end)
  const baseQuery = {
    ...(params.severity ? { severity: params.severity } : {}),
    ...(params.func ? { func: params.func } : {}),
    ...(params.status ? { status: params.status } : {}),
    ...(params.keyword ? { summary: params.keyword } : {}),
  }

  // event_analyzer가 장기 구간을 제한하는 경우를 대비해 30일 단위로 분할 조회한다.
  if (spanDays <= 31) {
    return fetchQueryLogs(ctx, {
      start: params.start,
      end: params.end,
      ...baseQuery,
    })
  }

  const chunkSizeDays = 30
  const deduped = new Map<string, any>()
  let cursor = params.start

  while (new Date(cursor).getTime() <= new Date(params.end).getTime()) {
    const chunkEnd = minDate(addDays(cursor, chunkSizeDays - 1), params.end)
    const { items } = await fetchQueryLogs(ctx, {
      start: cursor,
      end: chunkEnd,
      ...baseQuery,
    })

    for (const item of items) {
      const id = String(item?.eventId ?? item?.id ?? item?.uuid ?? JSON.stringify(item))
      if (!id) continue
      deduped.set(id, item)
    }

    cursor = addDays(chunkEnd, 1)
  }

  const mergedItems = Array.from(deduped.values())
  return { items: mergedItems, totalCount: mergedItems.length }
}

function parseLooseDate(value?: string): string | undefined {
  const raw = String(value ?? '').trim()
  if (!raw) return undefined

  if (/^\d{4}-\d{1,2}-\d{1,2}$/.test(raw)) {
    const [y, m, d] = raw.split('-').map((v) => Number(v))
    const date = new Date(y, m - 1, d)
    if (Number.isNaN(date.getTime())) return undefined
    return dateStr(date)
  }

  const korean = raw.match(/^(\d{1,2})\s*월\s*(\d{1,2})\s*일$/)
  if (korean) {
    const year = new Date().getFullYear()
    const month = Number(korean[1])
    const day = Number(korean[2])
    const date = new Date(year, month - 1, day)
    if (Number.isNaN(date.getTime())) return undefined
    return dateStr(date)
  }

  const slash = raw.match(/^(\d{1,2})\/(\d{1,2})$/)
  if (slash) {
    const year = new Date().getFullYear()
    const month = Number(slash[1])
    const day = Number(slash[2])
    const date = new Date(year, month - 1, day)
    if (Number.isNaN(date.getTime())) return undefined
    return dateStr(date)
  }

  return undefined
}

function extractDateRangeFromText(value?: string): { start?: string; end?: string } {
  const raw = String(value ?? '').trim()
  if (!raw) return {}

  const year = new Date().getFullYear()

  const full = raw.match(/(\d{4})\s*[.-]\s*(\d{1,2})\s*[.-]\s*(\d{1,2})\s*(?:부터|~|\-|to|에서)\s*(\d{4})\s*[.-]\s*(\d{1,2})\s*[.-]\s*(\d{1,2})/i)
  if (full) {
    const s = dateStr(new Date(Number(full[1]), Number(full[2]) - 1, Number(full[3])))
    const e = dateStr(new Date(Number(full[4]), Number(full[5]) - 1, Number(full[6])))
    return { start: s, end: e }
  }

  const sameMonth = raw.match(/(\d{1,2})\s*월\s*(\d{1,2})\s*일\s*(?:부터|~|\-|to|에서)\s*(\d{1,2})\s*일/i)
  if (sameMonth) {
    const month = Number(sameMonth[1])
    const s = dateStr(new Date(year, month - 1, Number(sameMonth[2])))
    const e = dateStr(new Date(year, month - 1, Number(sameMonth[3])))
    return { start: s, end: e }
  }

  const monthToMonth = raw.match(/(\d{1,2})\s*월\s*(\d{1,2})\s*일\s*(?:부터|~|\-|to|에서)\s*(\d{1,2})\s*월\s*(\d{1,2})\s*일/i)
  if (monthToMonth) {
    const s = dateStr(new Date(year, Number(monthToMonth[1]) - 1, Number(monthToMonth[2])))
    const e = dateStr(new Date(year, Number(monthToMonth[3]) - 1, Number(monthToMonth[4])))
    return { start: s, end: e }
  }

  return {}
}

function normalizeSeverity(severityArg?: string, sourceTextArg?: string): string | undefined {
  const severity = String(severityArg ?? '').trim().toLowerCase()
  if (['critical', 'high', 'medium', 'low'].includes(severity)) return severity

  const source = String(sourceTextArg ?? '').toLowerCase()
  if (!source) return undefined
  if (/(critical|치명)/.test(source)) return 'critical'
  if (/(high|높음)/.test(source)) return 'high'
  if (/(medium|중간|보통)/.test(source)) return 'medium'
  if (/(low|낮음)/.test(source)) return 'low'
  return undefined
}

function normalizeStatus(statusArg?: string, sourceTextArg?: string): string | undefined {
  const status = String(statusArg ?? '').trim().toLowerCase()
  if (status) return status

  const source = String(sourceTextArg ?? '').toLowerCase()
  if (!source) return undefined

  if (/(분석\s*실패|analyze\s*failed)/.test(source)) return 'analyze_failed'
  if (/(준비\s*실패|prepare\s*failed)/.test(source)) return 'prepare_failed'
  if (/(분석\s*완료|analyzed)/.test(source)) return 'analyzed'
  if (/(처리\s*완료|조치\s*완료|completed)/.test(source)) return 'completed'
  if (/(실패|failed)/.test(source)) return 'failed'

  return undefined
}

/** LLM이 넘긴 상대 기간 키워드를 start/end로 정규화. */
function resolvePeriod(period?: string, start?: string, end?: string, sourceTextArg?: string) {
  const normalizedStart = parseLooseDate(start)
  const normalizedEnd = parseLooseDate(end)

  if (normalizedStart || normalizedEnd) {
    return {
      start: normalizedStart ?? today(),
      end: normalizedEnd ?? normalizedStart ?? today(),
    }
  }

  const sourceText = String(sourceTextArg ?? '')
  const ranged = extractDateRangeFromText(sourceText)
  if (ranged.start || ranged.end) {
    return {
      start: ranged.start ?? today(),
      end: ranged.end ?? ranged.start ?? today(),
    }
  }

  const normalizedPeriod = String(period ?? '').toLowerCase()
  const source = sourceText.toLowerCase()
  const periodText = `${normalizedPeriod} ${source}`
  const compactPeriodText = compactForMatch(periodText)

  if (/어제|yesterday/.test(periodText) || compactPeriodText.includes('어제')) {
    return { start: daysAgo(1), end: daysAgo(1) }
  }

  if (
    /3\s*(달|개월)|3\s*month/.test(periodText) ||
    /3(?:개)?월(?:간|동안)?/.test(compactPeriodText) ||
    /3month/.test(compactPeriodText)
  ) {
    return { start: daysAgo(89), end: today() }
  }

  switch (normalizedPeriod) {
    case 'today':
    case '오늘':
      return { start: today(), end: today() }
    case 'week':
    case '최근 일주일':
    case '일주일':
      return { start: daysAgo(6), end: today() }
    case 'month':
    case '한달':
    case '한 달':
    case '1개월':
      return { start: daysAgo(29), end: today() }
    default:
      if (/일주일|week/.test(source) || /일주일(?:간|동안)?/.test(compactPeriodText)) {
        return { start: daysAgo(6), end: today() }
      }
      if (/한달|한\s*달|1\s*개월|month/.test(source) || /한달(?:간|동안)?|1개월(?:간|동안)?/.test(compactPeriodText)) {
        return { start: daysAgo(29), end: today() }
      }
      return { start: today(), end: today() }
  }
}

export const queryEvents: ToolDefinition = {
  declaration: {
    name: 'query_events',
    description:
      'AI 이벤트(로그)를 기간/심각도/기능/상태/키워드로 조회하고 요약을 반환한다. ' +
      '사용자가 건수, 목록, 통계, 특정 조건의 이벤트를 물을 때 사용한다. ' +
      '"이슈"는 "이벤트"와 같은 의미다.',
    parameters: {
      type: 'object',
      properties: {
        period: {
          type: 'string',
          description: '상대 기간. "today"|"week"|"month" 또는 "오늘"|"일주일"|"한달".',
        },
        start: { type: 'string', description: '시작일. YYYY-MM-DD 또는 M월D일(예: 7월1일).' },
        end: { type: 'string', description: '종료일. YYYY-MM-DD 또는 M월D일(예: 7월2일).' },
        severity: {
          type: 'string',
          description: '심각도 필터. critical | high | medium | low.',
        },
        func: {
          type: 'string',
          description:
            '기능 필터. "OO 기능 이슈/이벤트"처럼 "기능"이라는 단어와 함께 특정 기능을 지목할 때만 그 기능명(예: 주행, navigation, bsp)을 넣는다. ' +
            '"기능"이라는 단어 없이 그냥 "OO 이슈/이벤트"라고 하면 func 가 아니라 keyword 로 넣는다.',
        },
        status: {
          type: 'string',
          description:
            '상태 필터. received | prepared | prepare_failed | analyzing | analyzed | analyze_failed | completed | failed.',
        },
        keyword: {
          type: 'string',
          description:
            '요약/메시지 검색어. "기능" 지목 없이 언급된 단어(예: "주행 이슈 보여줘"의 "주행")는 여기에 넣는다. 기능 별칭이면 func로 자동 정규화될 수 있다.',
        },
      },
    },
  },
  async execute(args, ctx: ToolContext) {
    const rawMessage = String((ctx.context as Record<string, unknown> | undefined)?.__userMessage ?? '').trim()

    const phraseMatch = rawMessage
      ? await findPhraseMapMatch('robot/ailog/event', rawMessage)
      : null

    const mergedArgs: Record<string, unknown> = {
      ...(phraseMatch?.filtersTemplate ?? {}),
      ...(args ?? {}),
    }

    if (phraseMatch) {
      ctx.log?.log(
        `[phrase-map] matched route=robot/ailog/event matchType=${phraseMatch.matchType ?? 'exact'} intent=${phraseMatch.intentKey} phrase=${phraseMatch.phrase}`,
      )
    }

    const sourceText = [args.period, args.start, args.end, args.severity, args.func, args.status, args.keyword]
      .map((v) => String(v ?? '').trim())
      .concat(rawMessage ? [rawMessage] : [])
      .filter(Boolean)
      .join(' ')

    const sourceTextWithMappedArgs = [
      mergedArgs.period,
      mergedArgs.start,
      mergedArgs.end,
      mergedArgs.severity,
      mergedArgs.func,
      mergedArgs.status,
      mergedArgs.keyword,
    ]
      .map((v) => String(v ?? '').trim())
      .concat(rawMessage ? [rawMessage] : [])
      .filter(Boolean)
      .join(' ')

    const asOptionalString = (v: unknown): string | undefined => {
      const s = String(v ?? '').trim()
      return s || undefined
    }

    const { start, end } = resolvePeriod(
      asOptionalString(mergedArgs.period),
      asOptionalString(mergedArgs.start),
      asOptionalString(mergedArgs.end),
      sourceTextWithMappedArgs || sourceText,
    )
    const severity = normalizeSeverity(asOptionalString(mergedArgs.severity), sourceTextWithMappedArgs || sourceText)
    const status = normalizeStatus(asOptionalString(mergedArgs.status), sourceTextWithMappedArgs || sourceText)
    const { func, keyword } = await resolveFuncFilter(
      ctx,
      asOptionalString(mergedArgs.func),
      asOptionalString(mergedArgs.keyword),
      sourceTextWithMappedArgs || sourceText,
    )

    const contextScope = toObject(ctx.context)
    const cacheScope = {
      groupId: contextScope.groupId ?? null,
      siteId: contextScope.siteId ?? null,
    }

    const cacheKey = buildEventQueryCacheKey({
      routeKey: 'robot/ailog/event',
      eventAnalyzerUrl: ctx.eventAnalyzerUrl,
      scope: cacheScope,
      accessToken: ctx.accessToken,
      filters: {
        start,
        end,
        severity,
        func,
        status,
        keyword,
      },
    })

    // 수동 seed SQL과의 호환을 위해, 런타임 키 미스 시 seed 호환 키를 한 번 더 조회한다.
    const seedCompatibleKey = buildEventQueryCacheKey({
      routeKey: 'robot/ailog/event',
      eventAnalyzerUrl: '',
      scope: {},
      accessToken: undefined,
      filters: {
        start,
        end,
        severity,
        func,
        status,
        keyword,
      },
    })

    let queryParams = { start, end, severity, func, status, keyword }
    let cacheHit = false

    const cached = await getEventQueryCache<any>(cacheKey)
    if (cached && typeof cached === 'object') {
      const cachedFilters = extractResolvedFilters(cached)
      if (cachedFilters) {
        queryParams = cachedFilters
        cacheHit = true
        ctx.log?.log(
          `[cache] hit route=robot/ailog/event tool=query_events key=${cacheKey.slice(0, 12)} start=${cachedFilters.start} end=${cachedFilters.end} -> api-refresh`,
        )
      } else {
        ctx.log?.log(
          `[cache] malformed route=robot/ailog/event tool=query_events key=${cacheKey.slice(0, 12)} -> fallback-to-request-filters`,
        )
      }
    }

    if (!cacheHit && seedCompatibleKey !== cacheKey) {
      const seededCached = await getEventQueryCache<any>(seedCompatibleKey)
      if (seededCached && typeof seededCached === 'object') {
        const seedFilters = extractResolvedFilters(seededCached)
        if (seedFilters) {
          queryParams = seedFilters
          cacheHit = true
          ctx.log?.log(
            `[cache] hit-seed route=robot/ailog/event tool=query_events key=${seedCompatibleKey.slice(0, 12)} start=${seedFilters.start} end=${seedFilters.end} -> api-refresh`,
          )
        } else {
          ctx.log?.log(
            `[cache] hit-seed-malformed route=robot/ailog/event tool=query_events key=${seedCompatibleKey.slice(0, 12)} -> fallback-to-request-filters`,
          )
        }
      }
    }

    // 캐시 히트여도 DB payload의 필터를 기준으로 event_analyzer를 다시 조회한다.
    // event_analyzer /query/logs 실제 파라미터명: start, end, severity, func, status, summary
    const { items, totalCount } = await fetchQueryLogsWithChunking(ctx, queryParams)

    const summary = buildEventSummary(items, totalCount)
    const sampleItems = items.slice(0, 5).map((r: any) => ({
      eventId: r?.eventId ?? r?.id,
      severity: r?.severity ?? r?.level,
      func: r?.func ?? r?.functionality,
      summary: r?.summary ?? r?.reason,
      status: r?.analysisStatus ?? r?.status,
    }))

    const result = {
      // 프론트 useAiLogData 필터 키와 동일하게 반환 → FE가 그대로 적용
      resolvedFilters: {
        startDate: queryParams.start,
        endDate: queryParams.end,
        severity: queryParams.severity,
        // null 이면 프론트 드롭다운이 '전체'로 리셋된다(undefined 는 유지).
        func: queryParams.func ?? null,
        status: queryParams.status,
        searchQuery: queryParams.keyword ?? null,
      },
      matchedCount: totalCount,
      summary,
      sampleItems,
    }

    const ttlSeconds = resolveQueryCacheTtlSeconds(queryParams.start, queryParams.end)
    await setEventQueryCache(cacheKey, 'robot/ailog/event', result, ttlSeconds)
    ctx.log?.log(cacheHit
      ? `[cache] refresh route=robot/ailog/event tool=query_events key=${cacheKey.slice(0, 12)} ttl=${ttlSeconds}s`
      : `[cache] miss route=robot/ailog/event tool=query_events key=${cacheKey.slice(0, 12)} ttl=${ttlSeconds}s`)

    return result
  },
}

export const eventDataTools: ToolDefinition[] = [queryEvents]
