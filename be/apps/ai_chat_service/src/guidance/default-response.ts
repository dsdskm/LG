/** guidance 공통: 화면 매칭 실패 시의 기본 인사 응답. */
import { ScreenInstruction } from "./screen-instruction.type";

export function defaultResponse(): ScreenInstruction {
  return {
    mode: 'direct',
    chat_action: 'default',
    text: '안녕하세요 무엇을 도와드릴까요?',
  }
}