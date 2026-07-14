/** [guidance/B] robot 그룹/사이트 화면 안내 프롬프트 빌더. */
export function buildGroupsPrompt(msg: string) {
    return `
그룹/사이트 관리 화면입니다.

사용자 질문: ${msg}
`
}