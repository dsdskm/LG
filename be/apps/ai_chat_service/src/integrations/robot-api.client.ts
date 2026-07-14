/**
 * 외부 서비스 HTTP 클라이언트 (robot 백엔드 · event_analyzer · config_manager).
 * tool 들이 조회에 사용한다. 인증/엔드포인트는 ToolContext(요청 바디)에서 온다.
 */
import { randomUUID } from 'crypto'
import { fetchWithTimeout, safeJsonParse } from '../utils/utils'
import type { ToolContext } from '../pipeline/tool.type'

const DEFAULT_TIMEOUT_MS = 10_000

/** robot 백엔드(Java) prefix. 프론트 API_CONFIG.PREFIX_ROBOT 과 동일. */
const PREFIX_ROBOT = '/api/v1/web'

function buildHeaders(accessToken?: string): Record<string, string> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    timestamp: String(Math.floor(Date.now() / 1000)),
    'message-id': randomUUID(),
    'language-code': 'ko',
  }
  if (accessToken) headers.authorization = `Bearer ${accessToken}`
  return headers
}

function trimBase(url?: string): string {
  return String(url ?? '').replace(/\/+$/, '')
}

function buildQuery(params: Record<string, unknown> = {}): string {
  const sp = new URLSearchParams()
  for (const [k, v] of Object.entries(params)) {
    if (v === undefined || v === null || v === '') continue
    sp.set(k, String(v))
  }
  const q = sp.toString()
  return q ? `?${q}` : ''
}

async function getJson(
  url: string,
  ctx: ToolContext,
): Promise<any> {
  const res = await fetchWithTimeout(
    url,
    { method: 'GET', headers: buildHeaders(ctx.accessToken) },
    DEFAULT_TIMEOUT_MS,
  )
  const text = await res.text().catch(() => '')
  const json = safeJsonParse(text)
  if (!res.ok) {
    ctx.log?.error(`[robot-api] ${res.status} ${url} body=${text.slice(0, 500)}`)
    throw new Error(`robot api error ${res.status}`)
  }
  return json
}

/**
 * 로봇 목록 조회. 프론트 deviceApis.getDevices 와 동일 엔드포인트.
 * 응답: { content: Device[] } 형태(또는 data.content).
 */
export async function fetchDevices(
  ctx: ToolContext,
  params: Record<string, unknown> = {},
): Promise<any[]> {
  if (!ctx.apiBaseUrl) throw new Error('apiBaseUrl missing')
  const url = `${trimBase(ctx.apiBaseUrl)}${PREFIX_ROBOT}/devices${buildQuery({ size: 100, ...params })}`
  const json = await getJson(url, ctx)
  return json?.content ?? json?.data?.content ?? json?.data ?? []
}

/**
 * 사이트 목록 조회. 프론트 siteApis.getSites 와 동일.
 */
export async function fetchSites(
  ctx: ToolContext,
  params: Record<string, unknown> = {},
): Promise<any[]> {
  if (!ctx.apiBaseUrl) throw new Error('apiBaseUrl missing')
  const url = `${trimBase(ctx.apiBaseUrl)}${PREFIX_ROBOT}/sites${buildQuery({ size: 100, ...params })}`
  const json = await getJson(url, ctx)
  return json?.content ?? json?.data?.content ?? json?.data ?? []
}

/**
 * 그룹 목록 조회. 프론트 groupApis 와 동일 엔드포인트.
 */
export async function fetchGroups(
  ctx: ToolContext,
  params: Record<string, unknown> = {},
): Promise<any[]> {
  if (!ctx.apiBaseUrl) throw new Error('apiBaseUrl missing')
  const url = `${trimBase(ctx.apiBaseUrl)}${PREFIX_ROBOT}/groups${buildQuery({ size: 100, ...params })}`
  const json = await getJson(url, ctx)
  return json?.content ?? json?.data?.content ?? json?.data ?? []
}

/** config_manager 기능(func)/tags 카탈로그 prefix. 프론트 pathConfigManager 와 동일. */
const PREFIX_AI_CONFIG = '/config'

export type FuncCatalogItem = { func: string; tags: string[] }

/**
 * 기능(func) 카탈로그 조회. 프론트 getFuncs 와 동일 (config_manager /config/fun).
 * 각 항목의 func 문자열과 tags(별칭 키워드) 매핑을 반환한다.
 * URL 미설정/실패 시 빈 배열을 반환한다.
 */
export async function fetchFuncs(ctx: ToolContext): Promise<FuncCatalogItem[]> {
  if (!ctx.configManagerUrl) return []
  const url = `${trimBase(ctx.configManagerUrl)}${PREFIX_AI_CONFIG}/fun`
  const json = await getJson(url, ctx).catch((e) => {
    ctx.log?.error(`[robot-api] fetchFuncs failed: ${String((e as Error)?.message ?? e)}`)
    return null
  })
  if (!json) return []

  const list: any[] =
    (Array.isArray(json) && json) ||
    json?.data ||
    json?.items ||
    json?.data?.items ||
    json?.content ||
    []

  return (Array.isArray(list) ? list : [])
    .map((it: any) => ({
      func: String(it?.func ?? it?.name ?? '').trim(),
      tags: Array.isArray(it?.tags) ? it.tags.map((t: any) => String(t ?? '').trim()).filter(Boolean) : [],
    }))
    .filter((it) => it.func)
}

/**
 * AI 이벤트 통합 로그 조회. 프론트 getQueryLogs 와 동일 (event_analyzer /query/logs).
 * 응답 shape 다양: { data|items|list, pageInfo } → { items, pageInfo } 로 정규화.
 */
export async function fetchQueryLogs(
  ctx: ToolContext,
  params: Record<string, unknown> = {},
): Promise<{ items: any[]; totalCount: number }> {
  if (!ctx.eventAnalyzerUrl) throw new Error('eventAnalyzerUrl missing')
  const url = `${trimBase(ctx.eventAnalyzerUrl)}/query/logs${buildQuery({ startIndex: 0, count: 100000, ...params })}`
  const json = await getJson(url, ctx)

  const items: any[] =
    (Array.isArray(json) && json) ||
    json?.items ||
    json?.data?.items ||
    json?.data ||
    json?.list ||
    []

  const pageInfo = json?.pageInfo ?? json?.data?.pageInfo ?? {}
  const totalCount =
    Number(pageInfo?.totalCount ?? pageInfo?.total ?? pageInfo?.allCount) ||
    (Array.isArray(items) ? items.length : 0)

  return { items: Array.isArray(items) ? items : [], totalCount }
}
