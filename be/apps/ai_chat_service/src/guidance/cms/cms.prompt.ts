/** [guidance/B] CMS 화면 안내 프롬프트 빌더. */
export function buildCmsPrompt(msg: string) {
  return `
CMS(콘텐츠 관리 시스템) 입니다.

사용자 질문: ${msg}
`
}