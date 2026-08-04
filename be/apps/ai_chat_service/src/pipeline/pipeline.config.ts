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
  /** info RAG 선택 시 통과해야 하는 최소 top score. */
  infoRagMinScore: number
  /** 화면/앱 RAG에 주는 가산점. common 보다 우선할 때 사용. */
  infoRagScreenBonus: number
  /** "~~ 노드 사용법" 질의가 1차 RAG 미스일 때 강제 참조할 chunk_key 목록(csv). */
  infoNodeGuideFallbackChunkKeys: string[]
}

export function loadChatPipelineConfig(): ChatPipelineConfig {
  const toNumber = (v: string | undefined, fallback: number) => {
    const n = Number(v)
    return Number.isFinite(n) ? n : fallback
  }
  const toList = (v: string | undefined, fallback: string[]) => {
    const items = String(v ?? '')
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean)
    return items.length > 0 ? Array.from(new Set(items)) : fallback
  }
  return {
    actionRunnerUrl:
      process.env.ACTION_RUNNER_URL ?? 'http://localhost:3004',
    maxToolTurns: toNumber(process.env.CHAT_MAX_TOOL_TURNS, 4),
    ragTopK: toNumber(process.env.CHAT_RAG_TOP_K, 3),
    intentMinConfidence: Number(process.env.CHAT_INTENT_MIN_CONFIDENCE ?? 0.4),
    infoRagMinScore: toNumber(process.env.CHAT_INFO_RAG_MIN_SCORE, 1.5),
    infoRagScreenBonus: toNumber(process.env.CHAT_INFO_RAG_SCREEN_BONUS, 0.5),
    infoNodeGuideFallbackChunkKeys: toList(process.env.CHAT_INFO_NODE_GUIDE_FALLBACK_CHUNK_KEYS, []),
  }
}
