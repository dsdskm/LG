/**
 * RAG 서비스 (키워드 검색 + 근거 기반 답변).
 *
 * 1) retrieve: 발화를 토큰화해 컬렉션 청크와 키워드/본문 겹침으로 점수화 → 상위 K개.
 * 2) answer: 검색된 청크를 컨텍스트로 LLM에 넣어, 문서 근거로만 답하게 한다.
 */
import type { LlmClient } from '../../llm/llm.types'
import { getCollection as getStaticCollection, type RagChunk } from './rag.docs'
import type { ChatTurn } from '../pipeline.types'
import { getPromptStore } from '../../db/prompt-store.service'

/** 한글/영문/숫자 토큰 추출(2글자 이상). */
function tokenize(text: string): string[] {
  const lower = String(text ?? '').toLowerCase()
  const matched = lower.match(/[가-힣a-z0-9]+/g) ?? []
  return matched.filter((t) => t.length >= 2)
}

function scoreChunk(chunk: RagChunk, queryTokens: string[], rawQuery: string): number {
  const q = rawQuery.toLowerCase()
  let score = 0
  const isAsciiToken = (value: string) => /^[a-z0-9]+$/.test(value)

  const keywordTokenLooselyMatches = (keyword: string): boolean => {
    const keywordTokens = tokenize(keyword)
    if (keywordTokens.length === 0) return false

    return queryTokens.some((queryToken) => keywordTokens.some((keywordToken) => {
      if (queryToken === keywordToken) return true

      // ASCII 토큰(예: ifthen vs ifthenelse)은 부분 일치로 보지 않는다.
      if (isAsciiToken(queryToken) && isAsciiToken(keywordToken) && queryToken.length >= 4 && keywordToken.length >= 4) {
        return false
      }

      return keywordToken.includes(queryToken) || queryToken.includes(keywordToken)
    }))
  }

  // 키워드 정확/부분 매칭 (가중치 높음)
  for (const kw of chunk.keywords) {
    const k = kw.toLowerCase()
    if (q.includes(k)) score += 3
    else if (keywordTokenLooselyMatches(k)) score += 1.5
  }

  // 제목/본문 토큰 겹침(정확 토큰 기준)
  const haystackTokens = new Set(tokenize(`${chunk.title} ${chunk.body}`))
  for (const t of queryTokens) {
    if (haystackTokens.has(t)) score += 0.5
  }
  return score
}

export type RetrievedChunk = { chunk: RagChunk; score: number }
export type RagIntentType = 'info' | 'action'
export type RagLogger = {
  log: (msg: string) => void
  error: (msg: string) => void
  debug?: (msg: string) => void
}
export class RagService {
  constructor(
    private readonly client: LlmClient,
    private readonly maxOutputTokens: number,
    private readonly topK: number,
    private readonly logger: RagLogger,
  ) { }

  private stageLog(stage: string, status: string, reason: string, reqId = '-') {
    this.logger.log(`================= [${stage}] [reqId=${reqId}] status=${status} reason=${reason}`)
  }

  private resolveCollection(collectionName: string): { chunks: RagChunk[] } | undefined {
    const dbCollection = getPromptStore()?.getCollection(collectionName)
    if (dbCollection) {
      return {
        chunks: dbCollection.chunks.map((chunk) => ({
          id: chunk.id,
          title: chunk.title,
          keywords: chunk.keywords,
          body: chunk.body,
        })),
      }
    }

    return getStaticCollection(collectionName)
  }

  private supportsIntent(chunk: RagChunk, intentType?: RagIntentType): boolean {
    if (!intentType) return true

    const raw = String((chunk as any).intentType ?? '').trim().toLowerCase()
    if (!raw || raw === 'both') return true
    return raw === intentType
  }

  retrieve(collectionName: string, query: string, intentType?: RagIntentType): RetrievedChunk[] {
    const collection = this.resolveCollection(collectionName)
    if (!collection) return []

    const tokens = tokenize(query)
    return collection.chunks
      .filter((chunk) => this.supportsIntent(chunk, intentType))
      .map((chunk) => ({ chunk, score: scoreChunk(chunk, tokens, query) }))
      .filter((r) => r.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, this.topK)
  }

  /**
   * 문서 근거로 답변.
   * collectionNames 를 순서대로 검색해(탭 → 공통) 처음으로 청크가 잡히는 컬렉션을 쓴다.
   * 어디서도 못 찾으면 빈 텍스트를 반환하고 상위 계층에서 LLM 기본 응답으로 처리한다.
   */
  async answer(
    collectionNames: string | string[],
    message: string,
    history: ChatTurn[] = [],
    reqId = '-',
    options?: { intentType?: RagIntentType },
  ): Promise<{ text: string; usedCollection?: string; usedChunks: string[] }> {
    const names = Array.isArray(collectionNames) ? collectionNames : [collectionNames]

    let hits: RetrievedChunk[] = []
    let usedCollection: string | undefined
    this.stageLog('3-1단계:RAG_컬렉션후보', 'loaded', `후보 컬렉션 ${names.length}개를 순차 탐색`, reqId)
    this.logger.debug?.(
      `================= [3-1단계:RAG_컬렉션후보_추적] [reqId=${reqId}] names=${JSON.stringify(names)} messageLen=${String(message ?? '').length} historyTurns=${history.length}`,
    )
    for (const name of names) {
      const resolvedCollection = this.resolveCollection(name)
      this.stageLog(
        '3-1-1단계:RAG_컬렉션상태',
        resolvedCollection ? 'ready' : 'missing',
        `collection=${name} 존재 여부 확인`,
        reqId,
      )
      const found = this.retrieve(name, message, options?.intentType)
      this.stageLog('3-2단계:RAG_컬렉션탐색', found.length > 0 ? 'matched' : 'miss', `collection=${name} 탐색 완료(hitCount=${found.length})`, reqId)
      this.logger.debug?.(
        `================= [3-2단계:RAG_컬렉션탐색_추적] [reqId=${reqId}] collection=${name} intent=${options?.intentType ?? 'any'} hits=${JSON.stringify(found.map((row) => ({ id: row.chunk.id, score: row.score })))}`,
      )
      if (found.length) {
        hits = found
        usedCollection = name
        break
      }
    }
    if (hits.length === 0) {
      this.stageLog('3-3단계:RAG_탐색결과', 'empty', '모든 컬렉션에서 근거 문서를 찾지 못함', reqId)
      return { text: '', usedChunks: [] }
    }

    const referencedChunks = hits.map((h) => `${h.chunk.id}:${h.chunk.title}`).join(', ')
    this.logger.log(
      `================= [3-3-1단계:RAG_참조청크] [reqId=${reqId}] status=selected reason=collection=${usedCollection ?? '-'} referencedChunks=[${referencedChunks}]`,
    )

    const collection = usedCollection ? this.resolveCollection(usedCollection) : undefined

    const context = hits
      .map((h, i) => `[문서 ${i + 1}] ${h.chunk.title}\n${h.chunk.body}`)
      .join('\n\n')

    const commonSystem = getPromptStore()?.getPromptContent('common', 'system') ?? ''

    const ragSystem = context

    const system = [commonSystem, ragSystem].filter(Boolean).join('\n\n')

    this.stageLog(
      '3-4단계:RAG_프롬프트생성',
      'ready',
      `collection=${usedCollection ?? '-'} 근거 ${hits.length}개로 프롬프트 구성`,
      reqId,
    )
    this.logger.debug?.(
      `================= [3-4단계:RAG_프롬프트생성_추적] [reqId=${reqId}] commonSystemApplied=${Boolean(commonSystem)} systemLen=${system.length}`,
    )

    // this.logger.log(`[ragService] system ${system}`)

    const res = await this.client.generateContent({
      messages: [
        { role: 'system', content: system },
        ...history.map((t) => ({ role: t.role, content: t.content })),
        { role: 'user', content: message },
      ],
      maxOutputTokens: this.maxOutputTokens,
    })

    const text = (res.text ?? '').trim()
    this.stageLog(
      '3-6단계:RAG_응답생성완료',
      text ? 'completed' : 'empty',
      `collection=${usedCollection ?? '-'} 응답 생성 완료`,
      reqId,
    )
    this.logger.log(
      `================= [3-6-1단계:RAG_참조청크_최종] [reqId=${reqId}] status=used reason=collection=${usedCollection ?? '-'} usedChunkIds=[${hits.map((h) => h.chunk.id).join(', ')}]`,
    )
    this.logger.debug?.(
      `================= [3-6단계:RAG_응답생성완료_추적] [reqId=${reqId}] textLength=${text.length} usedChunks=${JSON.stringify(hits.map((h) => h.chunk.id))}`,
    )
    return {
      text,
      usedCollection,
      usedChunks: hits.map((h) => h.chunk.id),
    }
  }
}
