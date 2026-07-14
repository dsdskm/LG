/**
 * guidance(미등록 화면 정적 안내) 응답 타입.
 * direct: 즉시 반환 텍스트, llm: 프롬프트를 LLM에 태우고 실패 시 fallbackText.
 */
export type DirectInstruction = {
    mode: 'direct'
    chat_action: string
    text: string
}

export type LlmInstruction = {
    mode: 'llm'
    chat_action: string
    prompt: string
    fallbackText?: string
}

export type ScreenInstruction = DirectInstruction | LlmInstruction