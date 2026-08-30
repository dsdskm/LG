import { useUserStore } from '@repo/stores'
import { ENDPOINTS } from './constants'

// SSE(POST + JSON body + Bearer) 스트림을 fetch ReadableStream 으로 소비.
// EventSource는 GET/헤더 불가라 사용 불가 → voiceQueryApis.voiceQueryStream 과 동일 패턴.
const streamSse = async (path, body, { onEvent, signal } = {}) => {
  const token = useUserStore.getState().session?.accessToken
  const res = await fetch(`${import.meta.env.VITE_API_BASE_URL}${path}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {})
    },
    body: JSON.stringify(body),
    signal
  })
  if (!res.ok || !res.body) {
    throw new Error(`agent stream failed: ${res.status}`)
  }

  const reader = res.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''

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
        console.error('Failed to parse agent SSE event:', e, json)
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

// 자연어 명령 → ReAct 루프 (SSE)
const agentStream = (data, opts) => streamSse(`${ENDPOINTS.AGENT}/stream`, data, opts)

// 비가역 작업 승인/거부 후 재개 (SSE)
const agentConfirm = (data, opts) => streamSse(`${ENDPOINTS.AGENT}/confirm`, data, opts)

export { agentStream, agentConfirm }
