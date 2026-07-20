import { client } from '@repo/apis'
import { useUserStore } from '@repo/stores'
import { ENDPOINTS } from './constants'

const axiosCms = client(import.meta.env.VITE_API_BASE_URL)

const voiceQuery = async (data) => {
  try {
    const response = await axiosCms.post(ENDPOINTS.VOICE_QUERY, data)
    return response
  } catch (error) {
    console.error('Failed to run voice query:', error)
    throw error
  }
}

/**
 * SSE 스트리밍 질의. 각 SSE 이벤트(JSON)를 onEvent 콜백으로 전달.
 * @param {object} data - 질의 payload
 * @param {object} opts - { onEvent, signal }
 */
const voiceQueryStream = async (data, { onEvent, signal } = {}) => {
  const token = useUserStore.getState().session?.accessToken
  const res = await fetch(`${import.meta.env.VITE_API_BASE_URL}${ENDPOINTS.VOICE_QUERY}/stream`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {})
    },
    body: JSON.stringify(data),
    signal
  })
  if (!res.ok || !res.body) {
    throw new Error(`voiceQueryStream failed: ${res.status}`)
  }

  const reader = res.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''

  // SSE 프레임("\n\n" 구분)을 파싱해 data: 라인의 JSON을 onEvent 로 전달
  const flush = () => {
    let idx
    while ((idx = buffer.indexOf('\n\n')) !== -1) {
      const frame = buffer.slice(0, idx)
      buffer = buffer.slice(idx + 2)
      const line = frame.split('\n').find((l) => l.startsWith('data:'))
      if (!line) continue
      const json = line.slice(5).trim()
      if (!json) continue
      try {
        onEvent?.(JSON.parse(json))
      } catch (e) {
        console.error('Failed to parse SSE event:', e, json)
      }
    }
  }

  // eslint-disable-next-line no-constant-condition
  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    buffer += decoder.decode(value, { stream: true })
    flush()
  }
  buffer += decoder.decode()
  flush()
}

export { voiceQuery, voiceQueryStream }
