const BASE_URL = import.meta.env.VITE_AI_CHAT_SERVICE_URL

/**
 * 채팅 설정 전체 + 스키마 조회
 * @returns {Promise<{ code:number, data:{ schema:Array, values:Object } }>}
 */
export async function getChatSettings() {
  const response = await fetch(`${BASE_URL}/chat/settings`, {
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

export async function updateChatGuidance(id, payload) {
  const response = await fetch(`${BASE_URL}/chat/settings/guidance/${encodeURIComponent(String(id))}`, {
    method: 'PUT',
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
