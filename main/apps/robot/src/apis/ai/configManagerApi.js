import {
  axiosConfigManager,
  pathConfigManager,
  pathFunConfig,
  pathLlmConfig,
  pathAssigneesConfig,
  pathReportConfig,
  unwrapData,
  toStringArray,
  toOptionalTrimmedString,
  normalizeProviderKey
} from './shared'

const toAssigneesInput = (payload = {}) => {
  const base = Array.isArray(payload?.assignees) ? payload.assignees : Array.isArray(payload) ? payload : []

  return {
    assignees: base.map((item) => ({
      email: String(item?.email ?? '').trim(),
      name: String(item?.name ?? '').trim(),
      team: String(item?.team ?? '').trim(),
      profile: String(item?.profile ?? item?.job ?? '').trim(),
      tags: toStringArray(item?.tags)
    }))
  }
}

const toFuncCreateInput = (payload = {}) => {
  return {
    name: String(payload?.name ?? payload?.func ?? '').trim(),
    description: payload?.description,
    prompt: payload?.prompt,
    tags: payload?.tags,
    assignees: payload?.assignees
  }
}

const toFuncUpsertBody = (payload = {}) => {
  const body = {}

  const name = toOptionalTrimmedString(payload.name ?? payload.func)
  if (name) {
    body.name = name
    body.func = name
  }

  const description = toOptionalTrimmedString(payload.description)
  if (description !== undefined) body.description = description

  const prompt = toOptionalTrimmedString(payload.prompt)
  if (prompt !== undefined) body.prompt = prompt

  body.tags = toStringArray(payload.tags)
  body.assignees = toStringArray(payload.assignees)

  return body
}
export const getFuncs = async () => {
  const url = pathFunConfig
  const response = await axiosConfigManager.get(url)
  const payload = unwrapData(response.data)

  return {
    ...response,
    data: payload
  }
}

export const getFuncById = async (id) => {
  const url = `${pathFunConfig}/${encodeURIComponent(String(id))}`
  const response = await axiosConfigManager.get(url)
  const payload = unwrapData(response.data)

  return {
    ...response,
    data: payload
  }
}

export const setFuncCatalog = async (funcs = []) => {
  const url = pathFunConfig
  return axiosConfigManager.put(url, { funcs })
}

export const createFunc = async (payload = {}) => {
  const url = pathFunConfig
  const input = toFuncCreateInput(payload)
  const response = await axiosConfigManager.post(url, toFuncUpsertBody(input))
  const payloadData = unwrapData(response.data)

  return {
    ...response,
    data: payloadData
  }
}

export const updateFuncById = async (id, payload = {}) => {
  const url = `${pathFunConfig}/${encodeURIComponent(String(id))}`
  const input = toFuncCreateInput(payload)
  const response = await axiosConfigManager.put(url, toFuncUpsertBody(input))
  const payloadData = unwrapData(response.data)

  return {
    ...response,
    data: payloadData
  }
}

export const deleteFuncById = async (id) => {
  const url = `${pathFunConfig}/${encodeURIComponent(String(id))}`
  return axiosConfigManager.delete(url)
}

export const getLlmProviderConfigs = async () => {
  const url = `${pathLlmConfig}/provider`
  const response = await axiosConfigManager.get(url)
  const payload = unwrapData(response.data)

  const base = Array.isArray(payload) ? payload : Array.isArray(payload?.items) ? payload.items : []

  return {
    ...response,
    data: base
  }
}

export const getLlmConfigByProvider = async (provider) => {
  const normalizedProvider = normalizeProviderKey(provider)
  const url = `${pathLlmConfig}/${encodeURIComponent(normalizedProvider)}`
  const response = await axiosConfigManager.get(url)
  const payload = unwrapData(response.data)

  return {
    ...response,
    data: payload
  }
}

export const upsertLlmConfigByProvider = async (provider, instruction) => {
  const normalizedProvider = normalizeProviderKey(provider)
  const url = `${pathLlmConfig}/${encodeURIComponent(normalizedProvider)}`
  const response = await axiosConfigManager.put(url, {
    instruction: String(instruction ?? '')
  })
  const payload = unwrapData(response.data)

  return {
    ...response,
    data: payload
  }
}

export const getActiveLlmProvider = async () => {
  const url = `${pathLlmConfig}/active-provider`
  const response = await axiosConfigManager.get(url)
  const payload = unwrapData(response.data)

  return {
    ...response,
    data: {
      provider: payload?.provider
    }
  }
}

export const setActiveLlmProvider = async (provider) => {
  const normalizedProvider = normalizeProviderKey(provider)
  const url = `${pathLlmConfig}/active-provider`
  const response = await axiosConfigManager.put(url, {
    provider: normalizedProvider
  })
  const payload = unwrapData(response.data)

  return {
    ...response,
    data: {
      provider: payload?.provider
    }
  }
}

export const getAssignees = async () => {
  const url = pathAssigneesConfig
  const response = await axiosConfigManager.get(url)
  const payload = unwrapData(response.data)

  return {
    ...response,
    data: payload
  }
}

export const getAssigneeById = async (id) => {
  const url = `${pathAssigneesConfig}/id/${encodeURIComponent(String(id))}`
  const response = await axiosConfigManager.get(url)
  const payload = unwrapData(response.data)

  return {
    ...response,
    data: payload,
  }
}

export const getAssigneesByTeam = async (team) => {
  const url = `${pathAssigneesConfig}/team/${encodeURIComponent(String(team))}`
  const response = await axiosConfigManager.get(url)
  const payload = unwrapData(response.data)

  return {
    ...response,
    data: payload
  }
}

export const getAssigneesByFunc = async (func) => {
  const url = `${pathAssigneesConfig}/funcs/${encodeURIComponent(String(func))}`
  const response = await axiosConfigManager.get(url)
  const payload = unwrapData(response.data)

  return {
    ...response,
    data: payload
  }
}

export const getFuncAssigneesByFunc = async (func) => {
  const url = `${pathAssigneesConfig}/funcs/${encodeURIComponent(String(func))}`
  const response = await axiosConfigManager.get(url)
  const payload = unwrapData(response.data)

  return {
    ...response,
    data: payload
  }
}

export const putFuncAssignees = async (func, payload = {}) => {
  const url = `${pathAssigneesConfig}/funcs/${encodeURIComponent(String(func))}`
  const response = await axiosConfigManager.put(url, toAssigneesInput(payload))
  const payloadData = unwrapData(response.data)

  return {
    ...response,
    data: payloadData
  }
}

export const deleteFuncAssignees = async (func) => {
  const url = `${pathAssigneesConfig}/funcs/${encodeURIComponent(String(func))}`
  return axiosConfigManager.delete(url)
}

export const getReportConfig = async () => {
  try {
    const response = await axiosConfigManager.get(pathReportConfig)
    const payload = unwrapData(response.data)
    return {
      ...response,
      data: payload
    }
  } catch (e) {
    console.log(e)
    return null
  }
}
export const updateReportConfig = async (payload = {}) => {
  try {
    const response = await axiosConfigManager.put(pathReportConfig, {
      subjectTemplate: String(payload?.subjectTemplate ?? '').trim(),
      htmlTemplate: String(payload?.htmlTemplate ?? '').trim(),
      description: String(payload?.description ?? '').trim(),
      enabled: Boolean(payload?.enabled ?? true)
    })

    const responsePayload = unwrapData(response.data)

    return {
      ...response,
      data: responsePayload
    }
  } catch (e) {
    console.log(e)
    return null
  }
}

// 에러 컨텍스트 라인 수 (event_receiver가 mcap 파싱 시 에러 직전 N라인을 묶어 LLM에 전달)
export const getErrorContextLines = async () => {
  const url = `${pathConfigManager}/event/error-context-lines`
  const response = await axiosConfigManager.get(url)
  return unwrapData(response.data)
}

export const updateErrorContextLines = async (errorContextLines) => {
  const url = `${pathConfigManager}/event/error-context-lines`
  const response = await axiosConfigManager.put(url, {
    errorContextLines: Number(errorContextLines)
  })
  return unwrapData(response.data)
}
