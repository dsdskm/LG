/** [guidance/B] OTA 앱 화면 안내 라우팅. */
import { ScreenInstruction } from '../screen-instruction.type'
import { buildOtaPrompt } from './ota.prompt'
import { defaultResponse } from '../default-response'

const ROUTES = [
  '/ota/campaign',
  '/ota/artifact',
  '/ota/device',
  '/ota/settings',
]

export function handleOta(routeKey: string, body: any): ScreenInstruction {
  const msg = body.message ?? ''

  const matched = ROUTES.find(r => routeKey.includes(r))
  if (!matched) return defaultResponse()

  return {
    mode: 'llm',
    chat_action: 'ota',
    prompt: buildOtaPrompt(matched, msg),
  }
}