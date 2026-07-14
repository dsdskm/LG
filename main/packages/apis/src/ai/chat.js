const BASE_URL = import.meta.env.VITE_AI_CHAT_SERVICE_URL

/**
 * 사이트 어시스턴트 채팅 요청
 *
 * @param {Object} params
 * @param {string} params.message - 사용자 메시지
 * @param {string} [params.currentPath] - 현재 페이지 경로
 * @param {string} [params.currentApp] - 현재 앱 식별자
 * @param {string} [params.author] - 작성자(요청 사용자 식별자, 예: 이메일)
 * @param {string} [params.conversationId] - 대화 식별자(YYYYMMDD)
 * @param {string} [params.accessToken] - robot/AI API 호출용 액세스 토큰
 * @param {string} [params.apiBaseUrl] - robot 백엔드 베이스 URL
 * @param {string} [params.eventAnalyzerUrl] - event_analyzer 베이스 URL
 * @param {string} [params.configManagerUrl] - config_manager 베이스 URL
 * @param {Object} [params.previousFilters] - 직전에 적용된 이벤트 필터(후속 발화 병합용)
 * @param {Object} [params.context] - 화면 컨텍스트(groupId, siteId, eventId 등)
 * @param {AbortSignal} [params.signal] - 요청 중지용 AbortSignal
 * @returns {Promise<any>}
 */
export async function postSiteAssistantChat({
    message,
    currentPath,
    currentApp,
    author,
    conversationId,
    accessToken,
    apiBaseUrl,
    eventAnalyzerUrl,
    configManagerUrl,
    previousFilters,
    context,
    signal
}) {

    const key = currentPath.startsWith("/") ? currentPath.substring(1) : currentPath
    const response = await fetch(`${BASE_URL}/chat/site-assistant`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            message,
            currentPath,
            currentApp,
            key,
            author,
            conversationId,
            accessToken,
            apiBaseUrl,
            eventAnalyzerUrl,
            configManagerUrl,
            previousFilters,
            context
        }),
        signal
    })
    const ret = await response.json()
    console.log(`response`, ret)
    return ret
}
