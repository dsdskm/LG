const BASE_URL = import.meta.env.VITE_AI_CHAT_SERVICE_URL
let __chatSettingsBaseUrlLogged = false

/**
 * 채팅 설정 전체 + 스키마 조회
 * @returns {Promise<{ code:number, data:{ schema:Array, values:Object } }>}
 */
export async function getChatSettings() {  
  if (!__chatSettingsBaseUrlLogged) {
    console.info('[chat-settings] VITE_AI_CHAT_SERVICE_URL =', BASE_URL)
    __chatSettingsBaseUrlLogged = true
  }

  const requestUrl = `${BASE_URL}/chat/settings`
  const requestOptions = {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' },
  }

  console.info('[chat-settings][request] GET /chat/settings', {
    url: requestUrl,
    method: requestOptions.method,
    headers: requestOptions.headers,
    body: null,
    fullRequest: {
      url: requestUrl,
      method: requestOptions.method,
      headers: requestOptions.headers,
      body: null,
    },
  })

  const response = await fetch(requestUrl, requestOptions)
  const json = await response.json()

  console.info('[chat-settings][response] GET /chat/settings', {
    status: response.status,
    ok: response.ok,
    headers: Object.fromEntries(response.headers.entries ? response.headers.entries() : []),
    raw: json,
    fullResponse: json,
    hasManagement: Boolean(json?.data?.management),
    managementKeys: Object.keys(json?.data?.management ?? {}),
    history: Array.isArray(json?.data?.management?.history) ? json.data.management.history.length : 0,
    guidance: Array.isArray(json?.data?.management?.guidance) ? json.data.management.guidance.length : 0,
    prompts: Array.isArray(json?.data?.management?.prompts) ? json.data.management.prompts.length : 0,
    ragDocs: Array.isArray(json?.data?.management?.ragDocs) ? json.data.management.ragDocs.length : 0,
    screens: Array.isArray(json?.data?.management?.screens) ? json.data.management.screens.length : 0,
  })
  return json
}

/**
 * 채팅 내역 페이지 조회
 * @param {Object} params
 * @param {number} [params.page]
 * @param {number} [params.pageSize]
 * @param {string} [params.currentApp]
 * @param {string} [params.author]
 * @param {string} [params.conversationId]
 * @returns {Promise<{ code:number, data:{ items:Array, pagination:Object } }>} 
 */
export async function getChatHistory({ page = 1, pageSize = 20, currentApp, author, conversationId } = {}) {
  const query = new URLSearchParams()
  query.set('page', String(page))
  query.set('pageSize', String(pageSize))
  if (currentApp) query.set('currentApp', String(currentApp))
  if (author) query.set('author', String(author))
  if (conversationId) query.set('conversationId', String(conversationId))

  const response = await fetch(`${BASE_URL}/chat/settings/history?${query.toString()}`, {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' },
  })
  return response.json()
}

export async function saveLocalChatHistory(payload) {
  const response = await fetch(`${BASE_URL}/chat/settings/history`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  return response.json()
}

/**
 * 채팅 설정 부분 갱신
 * @param {Object} payload
 * @param {string} [payload.llmProvider] - 'azure' | 'vertex'
 * @param {Array<{key:string,value:any}>} [payload.settings] - 일반 key/value 갱신
 * @returns {Promise<{ code:number, data:{ values:Object } }>}
 */
export async function updateChatSettings(payload) {
  const response = await fetch(`${BASE_URL}/chat/settings`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  return response.json()
}

export async function createChatScreen(payload) {
  const response = await fetch(`${BASE_URL}/chat/settings/screens`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  return response.json()
}

export async function updateChatScreen(id, payload) {
  const response = await fetch(`${BASE_URL}/chat/settings/screens/${encodeURIComponent(String(id))}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  return response.json()
}

export async function deleteChatScreen(id) {
  const response = await fetch(`${BASE_URL}/chat/settings/screens/${encodeURIComponent(String(id))}`, {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
  })
  return response.json()
}

export async function updateChatPrompt(id, payload) {
  const response = await fetch(`${BASE_URL}/chat/settings/prompts/${encodeURIComponent(String(id))}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  return response.json()
}

export async function listPrompts({ appKey, screenKey, instruction, type } = {}) {
  const query = new URLSearchParams()
  if (appKey) query.set('app_key', String(appKey))
  if (screenKey) query.set('screen_key', String(screenKey))
  if (instruction !== undefined && instruction !== null && instruction !== '') query.set('instruction', String(instruction))
  if (type) query.set('type', String(type))

  const endpoint = query.toString() ? `${BASE_URL}/chat/settings/prompts?${query.toString()}` : `${BASE_URL}/chat/settings/prompts`
  console.info('[chat-settings] GET /chat/settings/prompts', {
    appKey: appKey ?? null,
    screenKey: screenKey ?? null,
    instruction: instruction ?? null,
    type: type ?? null,
    endpoint,
  })

  const response = await fetch(endpoint, {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' },
  })
  const json = await response.json()
  console.info('[chat-settings] GET /chat/settings/prompts response', {
    status: response.status,
    ok: response.ok,
    items: Array.isArray(json?.data?.items) ? json.data.items : Array.isArray(json?.items) ? json.items : [],
  })
  return json
}

export async function listChatPromptTypes() {
  const response = await fetch(`${BASE_URL}/chat/settings/prompts/types`, {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' },
  })
  return response.json()
}

export async function createChatPrompt(payload) {
  const response = await fetch(`${BASE_URL}/chat/settings/prompts`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  return response.json()
}

export async function deleteChatPrompt(id) {
  const response = await fetch(`${BASE_URL}/chat/settings/prompts/${encodeURIComponent(String(id))}`, {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
  })
  return response.json()
}

export async function upsertCommonChatPrompt(payload) {
  const response = await fetch(`${BASE_URL}/chat/settings/prompts/common`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  return response.json()
}

export async function getGuidanceList({ appKey, screenKey, id } = {}) {
  const query = new URLSearchParams()
  if (appKey) query.set('app_key', String(appKey))
  if (screenKey) query.set('screen_key', String(screenKey))
  if (id !== undefined && id !== null && id !== '') query.set('id', String(id))

  const endpoint = query.toString() ? `${BASE_URL}/chat/settings/guidance?${query.toString()}` : `${BASE_URL}/chat/settings/guidance`
  console.info('[chat-settings] GET /chat/settings/guidance', {
    appKey: appKey ?? null,
    screenKey: screenKey ?? null,
    id: id ?? null,
    endpoint,
  })

  const response = await fetch(endpoint, {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' },
  })
  return response.json()
}

export async function getRagList({ appKey, screenKey, id } = {}) {
  const query = new URLSearchParams()
  if (appKey) query.set('app_key', String(appKey))
  if (screenKey) query.set('screen_key', String(screenKey))
  if (id !== undefined && id !== null && id !== '') query.set('id', String(id))

  const endpoint = query.toString() ? `${BASE_URL}/chat/settings/rag-docs?${query.toString()}` : `${BASE_URL}/chat/settings/rag-docs`
  console.info('[chat-settings] GET /chat/settings/rag-docs', {
    appKey: appKey ?? null,
    screenKey: screenKey ?? null,
    id: id ?? null,
    endpoint,
  })

  const response = await fetch(endpoint, {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' },
  })
  const json = await response.json()
  console.info('[chat-settings] GET /chat/settings/rag-docs response', {
    status: response.status,
    ok: response.ok,
    items: Array.isArray(json?.data?.items) ? json.data.items : Array.isArray(json?.items) ? json.items : [],
  })
  return json
}

export async function updateChatGuidance(id, payload) {
  const response = await fetch(`${BASE_URL}/chat/settings/guidance/${encodeURIComponent(String(id))}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  return response.json()
}

export async function createChatGuidance(payload) {
  const response = await fetch(`${BASE_URL}/chat/settings/guidance`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  return response.json()
}

export async function deleteChatGuidance(id) {
  const response = await fetch(`${BASE_URL}/chat/settings/guidance/${encodeURIComponent(String(id))}`, {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
  })
  return response.json()
}

export async function updateChatRagDoc(id, payload) {
  const response = await fetch(
    `${BASE_URL}/chat/settings/rag-docs/${encodeURIComponent(String(id))}`,
    {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    },
  )
  return response.json()
}

export async function upsertCommonChatRagDoc(payload) {
  const response = await fetch(`${BASE_URL}/chat/settings/rag-docs/common`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  return response.json()
}

export async function createCommonChatRagDoc(payload) {
  const response = await fetch(`${BASE_URL}/chat/settings/rag-docs/common`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  return response.json()
}

const SCREEN_RULE_LIST_CACHE = new Map()

export function clearChatRuleListCache(appKey, screenKey) {
  const normalizedAppKey = String(appKey ?? '').trim() || 'common'
  const normalizedScreenKey = String(screenKey ?? '').trim() || 'common'
  const cacheKey = `${normalizedAppKey}::${normalizedScreenKey}`
  SCREEN_RULE_LIST_CACHE.delete(cacheKey)

  if (!screenKey) {
    for (const key of SCREEN_RULE_LIST_CACHE.keys()) {
      if (key.startsWith(`${normalizedAppKey}::`)) SCREEN_RULE_LIST_CACHE.delete(key)
    }
  }
}

export async function listChatRules({ appKey, screenKey, forceRefresh = true } = {}) {
  const normalizedAppKey = String(appKey ?? '').trim() || 'common'
  const normalizedScreenKey = String(screenKey ?? '').trim() || 'common'
  const cacheKey = screenKey ? `${normalizedAppKey}::${normalizedScreenKey}` : `${normalizedAppKey}::app-all`

  if (!forceRefresh) {
    const cached = SCREEN_RULE_LIST_CACHE.get(cacheKey)
    if (cached) {
      console.info('[chat-settings] GET /chat/settings/rules cache-hit', {
        appKey: normalizedAppKey,
        screenKey: normalizedScreenKey,
        cacheKey,
        itemCount: Array.isArray(cached?.data?.items) ? cached.data.items.length : Array.isArray(cached?.items) ? cached.items.length : 0,
      })
      return cached
    }
  } else {
    SCREEN_RULE_LIST_CACHE.delete(cacheKey)
  }

  const query = new URLSearchParams()
  if (appKey) query.set('app_key', String(appKey))
  if (screenKey) query.set('screen_key', String(screenKey))

  const endpoint = query.toString() ? `${BASE_URL}/chat/settings/rules?${query.toString()}` : `${BASE_URL}/chat/settings/rules`
  console.info('[chat-settings] GET /chat/settings/rules request', {
    appKey: normalizedAppKey,
    screenKey: normalizedScreenKey,
    cacheKey,
    endpoint,
    scope: screenKey ? 'screen' : 'app',
    forceRefresh,
  })

  const response = await fetch(endpoint, {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' },
  })
  const json = await response.json()
  SCREEN_RULE_LIST_CACHE.set(cacheKey, json)
  console.info('[chat-settings] GET /chat/settings/rules response', {
    status: response.status,
    ok: response.ok,
    itemCount: Array.isArray(json?.data?.items) ? json.data.items.length : Array.isArray(json?.items) ? json.items.length : 0,
    appKey: normalizedAppKey,
    screenKey: normalizedScreenKey,
    cacheKey,
    scope: screenKey ? 'screen' : 'app',
    forceRefresh,
  })
  return json
}

export async function listAllChatRules() {
  const response = await fetch(`${BASE_URL}/chat/settings/rules/all`, {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' },
  })
  return response.json()
}

export async function matchChatRule({ appKey, screenKey, message } = {}) {
  const payload = { appKey, screenKey, message }
  const response = await fetch(`${BASE_URL}/chat/settings/rules/match`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })

  const json = await response.json()
  return json
}

export async function upsertChatRule(payload) {
  const response = await fetch(`${BASE_URL}/chat/settings/rules`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  return response.json()
}

export async function deleteChatRule(id) {
  const response = await fetch(`${BASE_URL}/chat/settings/rules/${encodeURIComponent(String(id))}`, {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
  })
  return response.json()
}

export async function createChatRagDoc(payload) {
  const response = await fetch(`${BASE_URL}/chat/settings/rag-docs`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  return response.json()
}

export async function deleteChatRagDoc(id) {
  const response = await fetch(`${BASE_URL}/chat/settings/rag-docs/${encodeURIComponent(String(id))}`, {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
  })
  return response.json()
}
