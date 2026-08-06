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

  const response = await fetch(`${BASE_URL}/chat/settings`, {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' },
  })

  const json = await response.json()
  console.info('[chat-settings] GET /chat/settings', {
    status: response.status,
    ok: response.ok,
    screens: Array.isArray(json?.data?.management?.screens) ? json.data.management.screens.length : 0,
    screenTools: Array.isArray(json?.data?.management?.screenTools) ? json.data.management.screenTools.length : 0,
    actionTypes: Array.isArray(json?.data?.management?.actionTypes) ? json.data.management.actionTypes.length : 0,
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

export async function updateChatPrompt(id, payload) {
  const response = await fetch(`${BASE_URL}/chat/settings/prompts/${encodeURIComponent(String(id))}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
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

export async function upsertCommonChatPrompt(payload) {
  const response = await fetch(`${BASE_URL}/chat/settings/prompts/common`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  return response.json()
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

export async function updateChatScreenTool(id, payload) {
  const response = await fetch(
    `${BASE_URL}/chat/settings/screen-tools/${encodeURIComponent(String(id))}`,
    {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    },
  )
  return response.json()
}

export async function createCommonChatScreenTool(payload) {
  const response = await fetch(`${BASE_URL}/chat/settings/screen-tools/common`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  return response.json()
}

export async function createChatScreenTool(payload) {
  const response = await fetch(`${BASE_URL}/chat/settings/screen-tools`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  return response.json()
}

export async function deleteChatScreenTool(id) {
  const response = await fetch(`${BASE_URL}/chat/settings/screen-tools/${encodeURIComponent(String(id))}`, {
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
