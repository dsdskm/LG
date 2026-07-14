/** [guidance/B] OTA 화면 안내 프롬프트 빌더. */
export function buildOtaPrompt(route: string, msg: string) {
    return `
OTA 시스템 Assistant입니다.

현재 화면: ${route}

이 시스템은 SW 배포, 디바이스 관리, 정책 관리 등을 수행합니다.

사용자 질문: ${msg}
`
}