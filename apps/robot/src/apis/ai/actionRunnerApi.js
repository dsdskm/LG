import { axiosActionRunner, pathActionRunner, unwrapData, toOptionalTrimmedString, toStringArray } from './shared'

const normalizeActionItem = (item, index) => {
  const source = item && typeof item === 'object' ? item : {}
  const enabledRaw = source.enable ?? source.enabled ?? source.isEnabled

  return {
    id: source.id ?? source.actionId ?? source._id ?? `action-${index + 1}`,
    key: String(source.key ?? source.actionKey ?? source.code ?? '').trim(),
    name: String(source.name ?? source.actionName ?? source.title ?? '').trim(),
    description: String(source.description ?? '').trim(),
    enable: typeof enabledRaw === 'string' ? enabledRaw.trim().toLowerCase() === 'true' : Boolean(enabledRaw),
    funcs: toStringArray(source.funcs),
    createdAt: source.createdAt ?? null,
    updatedAt: source.updatedAt ?? null
  }
}

const normalizeActionsPayload = (payload) => {
  const base = Array.isArray(payload)
    ? payload
    : Array.isArray(payload?.items)
      ? payload.items
      : Array.isArray(payload?.actions)
        ? payload.actions
        : Array.isArray(payload?.list)
          ? payload.list
          : Array.isArray(payload?.rows)
            ? payload.rows
            : Array.isArray(payload?.results)
              ? payload.results
              : Array.isArray(payload?.content)
                ? payload.content
                : Array.isArray(payload?.data)
                  ? payload.data
                  : Array.isArray(payload?.result)
                    ? payload.result
                    : Array.isArray(payload?.result?.items)
                      ? payload.result.items
                      : Array.isArray(payload?.result?.actions)
                        ? payload.result.actions
                        : Array.isArray(payload?.result?.list)
                          ? payload.result.list
                          : []

  return base.map(normalizeActionItem)
}

const toActionInput = (payload = {}) => {
  const body = {
    key: String(payload?.key ?? '').trim(),
    name: String(payload?.name ?? '').trim(),
    enable: Boolean(payload?.enable),
    // 이 액션을 사용할 수 있는 기능(func) 키 목록. 비우면 모든 기능 공통.
    funcs: toStringArray(payload?.funcs)
  }

  const description = toOptionalTrimmedString(payload?.description)
  if (description !== undefined) {
    body.description = description
  }

  return body
}

export const getActions = async () => {
  const url = pathActionRunner
  const response = await axiosActionRunner.get(url)
  const payload = unwrapData(response.data)

  return {
    ...response,
    data: normalizeActionsPayload(payload)
  }
}

export const getActionById = async (id) => {
  const url = `${pathActionRunner}/${encodeURIComponent(String(id))}`
  const response = await axiosActionRunner.get(url)
  const payload = unwrapData(response.data)

  return {
    ...response,
    data: normalizeActionItem(payload, 0)
  }
}

export const createAction = async (payload = {}) => {
  const url = pathActionRunner
  const response = await axiosActionRunner.post(url, toActionInput(payload))
  const payloadData = unwrapData(response.data)

  return {
    ...response,
    data: normalizeActionItem(payloadData, 0)
  }
}

export const updateActionById = async (id, payload = {}) => {
  const url = `${pathActionRunner}/${encodeURIComponent(String(id))}`
  const response = await axiosActionRunner.put(url, toActionInput(payload))
  const payloadData = unwrapData(response.data)

  return {
    ...response,
    data: normalizeActionItem(payloadData, 0)
  }
}

export const deleteActionById = async (id) => {
  const url = `${pathActionRunner}/${encodeURIComponent(String(id))}`
  return axiosActionRunner.delete(url)
}

/**
 * 추천 액션 실행(현재 백엔드는 더미) 후 해당 이슈를 "조치 완료"로 전이한다.
 * POST /actions/run  body: { eventId, key? }
 */
export const runAction = async ({ eventId, key } = {}) => {
  const url = `${pathActionRunner}/run`
  const body = { eventId: Number(eventId) }
  const trimmedKey = String(key ?? '').trim()
  if (trimmedKey) body.key = trimmedKey

  const response = await axiosActionRunner.post(url, body)
  return {
    ...response,
    data: unwrapData(response.data)
  }
}
