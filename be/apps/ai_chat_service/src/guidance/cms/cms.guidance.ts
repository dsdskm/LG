/** [guidance/B] CMS 앱 화면 안내 라우팅. */
import { ScreenInstruction } from '../screen-instruction.type'
import { buildCmsPrompt } from './cms.prompt'

export function handleCms(_: string, body: any): ScreenInstruction {
  return {
    mode: 'llm',
    chat_action: 'cms',
    prompt: buildCmsPrompt(body.message ?? ''),
  }
}