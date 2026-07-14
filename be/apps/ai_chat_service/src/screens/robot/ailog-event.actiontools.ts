/**
 * robot > AI 로그 분석 > 이벤트 탭의 액션 명령 tool (MCP 실행부).
 *
 * action_runner(/actions, /actions/run)를 호출해 추천 조치를 즉시 실행한다.
 * - list_recommended_actions: 기능(func)에 사용 가능한 액션 목록 조회
 * - run_action: eventId + key 로 액션 실행 → 이벤트를 조치 완료로 전이
 */
import type { ToolContext, ToolDefinition } from '../../pipeline/tool.type'
import { getPromptStore } from '../../db/prompt-store.service'
import { fetchWithTimeout, safeJsonParse } from '../../utils/utils'

const TIMEOUT_MS = 10_000

function resolveToolDescription(key: string, toolName: string, fallback: string): string {
  return getPromptStore()?.getPromptContent(key, `tool-description:${toolName}`) ?? fallback
}

function base(ctx: ToolContext): string {
  const url = ctx.actionRunnerUrl
  if (!url) throw new Error('actionRunnerUrl missing')
  return url.replace(/\/+$/, '')
}

async function callJson(url: string, init: RequestInit): Promise<any> {
  const res = await fetchWithTimeout(
    url,
    { ...init, headers: { 'Content-Type': 'application/json', ...(init.headers ?? {}) } },
    TIMEOUT_MS,
  )
  const text = await res.text().catch(() => '')
  const json = safeJsonParse(text)
  if (!res.ok) throw new Error(`action_runner ${res.status}: ${text.slice(0, 300)}`)
  return json?.data ?? json
}

export const listRecommendedActions: ToolDefinition = {
  declaration: {
    name: 'list_recommended_actions',
    description: resolveToolDescription(
      'robot/ailog/event',
      'list_recommended_actions',
      '실행 가능한 추천 조치(액션) 목록을 조회한다. 특정 기능(func)에 한정할 수 있다. ' +
      '어떤 조치를 실행할지 결정하기 전에 먼저 이 tool 로 사용 가능한 액션을 확인한다.',
    ),
    parameters: {
      type: 'object',
      properties: {
        func: { type: 'string', description: '기능 키(예: navigation). 비우면 공통 액션 포함 전체.' },
      },
    },
  },
  async execute(args, ctx: ToolContext) {
    const func = String(args.func ?? '').trim()
    const url = `${base(ctx)}/actions${func ? `?func=${encodeURIComponent(func)}` : ''}`
    const list = await callJson(url, { method: 'GET' })
    const rows = Array.isArray(list) ? list : []
    return rows.map((a: any) => ({
      key: a?.key,
      name: a?.name,
      description: a?.description,
    }))
  },
}

export const runAction: ToolDefinition = {
  declaration: {
    name: 'run_action',
    description: resolveToolDescription(
      'robot/ailog/event',
      'run_action',
      '지정한 이벤트에 추천 조치를 실행하고 해당 이벤트를 조치 완료로 전이한다. ' +
      'eventId 를 모르면 현재 화면 컨텍스트의 선택된 이벤트를 사용한다.',
    ),
    parameters: {
      type: 'object',
      properties: {
        eventId: { type: 'number', description: '조치를 실행할 이벤트 ID.' },
        key: { type: 'string', description: '실행할 액션 key(예: restart_navigation).' },
      },
      required: ['key'],
    },
  },
  async execute(args, ctx: ToolContext) {
    const eventId = Number(args.eventId ?? ctx.context?.eventId)
    const key = String(args.key ?? '').trim()

    if (!Number.isInteger(eventId) || eventId <= 0) {
      return { ok: false, error: '실행할 이벤트 ID를 확인할 수 없습니다.' }
    }
    if (!key) return { ok: false, error: '실행할 액션 key가 필요합니다.' }

    const result = await callJson(`${base(ctx)}/actions/run`, {
      method: 'POST',
      body: JSON.stringify({ eventId, key }),
    })
    return { ok: true, eventId, key, result }
  },
}

export const eventActionTools: ToolDefinition[] = [listRecommendedActions, runAction]
