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

const normKey = (s: unknown) => String(s ?? '').trim().toLowerCase()

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
): Promise<{ func?: string; keyword?: string }> {
  const func = funcArg ? String(funcArg).trim() : undefined
  let keyword = keywordArg ? String(keywordArg) : undefined
  if (!func) return { func: undefined, keyword }

  const catalog = await fetchFuncs(ctx).catch((): FuncCatalogItem[] => [])
  const target = normKey(func)
  const matched = catalog.find(
    (f) => normKey(f.func) === target || f.tags.some((t) => normKey(t) === target),
  )

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

/** LLM이 넘긴 상대 기간 키워드를 start/end로 정규화. */
function resolvePeriod(period?: string, start?: string, end?: string) {
  if (start || end) return { start: start ?? today(), end: end ?? today() }
  switch (String(period ?? '').toLowerCase()) {
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
      return { start: daysAgo(29), end: today() }
    default:
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
          description: '상대 기간. "today" | "week" | "month" 중 하나. start/end 를 직접 줄 수도 있다.',
        },
        start: { type: 'string', description: '시작일 YYYY-MM-DD.' },
        end: { type: 'string', description: '종료일 YYYY-MM-DD.' },
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
            '요약/메시지 검색어. "기능" 지목 없이 언급된 단어(예: "주행 이슈 보여줘"의 "주행")는 여기에 넣는다.',
        },
      },
    },
  },
  async execute(args, ctx: ToolContext) {
    const { start, end } = resolvePeriod(args.period, args.start, args.end)
    const severity = args.severity ? String(args.severity).toLowerCase() : undefined
    const status = args.status ? String(args.status).toLowerCase() : undefined
    const { func, keyword } = await resolveFuncFilter(ctx, args.func, args.keyword)

    // event_analyzer /query/logs 의 실제 파라미터명: start, end, severity, func, status, summary
    const { items, totalCount } = await fetchQueryLogs(ctx, {
      start,
      end,
      ...(severity ? { severity } : {}),
      ...(func ? { func } : {}),
      ...(status ? { status } : {}),
      ...(keyword ? { summary: keyword } : {}),
    })

    const summary = buildEventSummary(items, totalCount)
    const sampleItems = items.slice(0, 5).map((r: any) => ({
      eventId: r?.eventId ?? r?.id,
      severity: r?.severity ?? r?.level,
      func: r?.func ?? r?.functionality,
      summary: r?.summary ?? r?.reason,
      status: r?.analysisStatus ?? r?.status,
    }))

    return {
      // 프론트 useAiLogData 필터 키와 동일하게 반환 → FE가 그대로 적용
      resolvedFilters: {
        startDate: start,
        endDate: end,
        severity,
        // null 이면 프론트 드롭다운이 '전체'로 리셋된다(undefined 는 유지).
        func: func ?? null,
        status,
        searchQuery: keyword ?? null,
      },
      matchedCount: totalCount,
      summary,
      sampleItems,
    }
  },
}

export const eventDataTools: ToolDefinition[] = [queryEvents]
