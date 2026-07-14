/** [guidance/B] TMS 앱 화면 안내 라우팅. */
import { ScreenInstruction } from '../screen-instruction.type'
import { buildTmsPrompt } from './tms.prompt'

export function handleTms(_: string, body: any): ScreenInstruction {
  return {
    mode: 'llm',
    chat_action: 'tms',
    prompt: buildTmsPrompt(body.message ?? ''),
  }
}