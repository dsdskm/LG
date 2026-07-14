/** [guidance/B] robot 사용자 관리 화면 안내 프롬프트 빌더. */
export function buildUsersPrompt(msg: string) {
    return `
사용자 관리 화면입니다.

사용자 질문: ${msg}
`
}