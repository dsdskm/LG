/** [guidance/B] TMS 화면 안내 프롬프트 빌더. */
export function buildTmsPrompt(msg: string) {
  return `
TMS(과제/일정 관리 시스템) 입니다.

사용자 질문: ${msg}
`
}