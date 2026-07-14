/**
 * 챗봇 파이프라인 환경설정.
 * LLM 자체 설정은 azure-openai.config 를 그대로 재사용하고,
 * 여기서는 파이프라인 전용 값(외부 서비스 URL, 튜닝 파라미터)만 다룬다.
 */
export interface ChatPipelineConfig {
  /** action_runner 베이스 URL. 액션 명령 실행에 사용. */
  actionRunnerUrl: string
  /** tool-calling 루프 최대 반복 횟수(무한루프 방지). */
  maxToolTurns: number
  /** RAG 검색 시 반환할 최대 청크 수. */
  ragTopK: number
  /** 인텐트 분류 신뢰도가 이 값 미만이면 info(안전) 로 폴백. */
  intentMinConfidence: number
}

export function loadChatPipelineConfig(): ChatPipelineConfig {
  const toNumber = (v: string | undefined, fallback: number) => {
    const n = Number(v)
    return Number.isFinite(n) ? n : fallback
  }
  return {
    actionRunnerUrl:
      process.env.ACTION_RUNNER_URL ?? 'http://localhost:3004',
    maxToolTurns: toNumber(process.env.CHAT_MAX_TOOL_TURNS, 4),
    ragTopK: toNumber(process.env.CHAT_RAG_TOP_K, 3),
    intentMinConfidence: Number(process.env.CHAT_INTENT_MIN_CONFIDENCE ?? 0.4),
  }
}
