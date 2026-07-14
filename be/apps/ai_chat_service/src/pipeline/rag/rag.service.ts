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

  // 키워드 정확/부분 매칭 (가중치 높음)
  for (const kw of chunk.keywords) {
    const k = kw.toLowerCase()
    if (q.includes(k)) score += 3
    else if (queryTokens.some((t) => k.includes(t) || t.includes(k))) score += 1.5
  }

  // 제목/본문 토큰 겹침
  const haystack = `${chunk.title} ${chunk.body}`.toLowerCase()
  for (const t of queryTokens) {
    if (haystack.includes(t)) score += 0.5
  }
  return score
}

export type RetrievedChunk = { chunk: RagChunk; score: number }
export type RagLogger = {
  log: (msg: string) => void
  error: (msg: string) => void
}
export class RagService {
  constructor(
    private readonly client: LlmClient,
    private readonly maxOutputTokens: number,
    private readonly topK: number,
    private readonly logger: RagLogger,
  ) { }

  private resolveCollection(collectionName: string): { scope: string; chunks: RagChunk[] } | undefined {
    const dbCollection = getPromptStore()?.getCollection(collectionName)
    if (dbCollection) {
      return {
        scope: dbCollection.scope,
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

  retrieve(collectionName: string, query: string): RetrievedChunk[] {
    const collection = this.resolveCollection(collectionName)
    if (!collection) return []

    const tokens = tokenize(query)
    return collection.chunks
      .map((chunk) => ({ chunk, score: scoreChunk(chunk, tokens, query) }))
      .filter((r) => r.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, this.topK)
  }

  /**
   * 문서 근거로 답변.
   * collectionNames 를 순서대로 검색해(탭 → 공통) 처음으로 청크가 잡히는 컬렉션을 쓴다.
   * 어디서도 못 찾으면 fallbackText 로 대체한다.
   */
  async answer(
    collectionNames: string | string[],
    message: string,
    fallbackText: string,
    history: ChatTurn[] = [],
  ): Promise<{ text: string; usedCollection?: string; usedChunks: string[] }> {
    const names = Array.isArray(collectionNames) ? collectionNames : [collectionNames]

    let hits: RetrievedChunk[] = []
    let usedCollection: string | undefined
    this.logger.log(`names ${JSON.stringify(names)}`)
    for (const name of names) {
      const found = this.retrieve(name, message)
      if (found.length) {
        hits = found
        usedCollection = name
        break
      }
    }
    if (hits.length === 0) {
      return { text: fallbackText, usedChunks: [] }
    }

    const collection = usedCollection ? this.resolveCollection(usedCollection) : undefined

    const context = hits
      .map((h, i) => `[문서 ${i + 1}] ${h.chunk.title}\n${h.chunk.body}`)
      .join('\n\n')

    const commonSystem = getPromptStore()?.getPromptContent('common', 'system') ?? ''

    const ragSystem = [
      `너는 "${collection?.scope ?? ''}" 화면의 안내 챗봇이다.`,
      '아래 문서 내용에만 근거해 한국어로 간결하게(2~4문장) 답한다.',
      '문서에 없는 내용은 지어내지 말고, 모르면 그렇게 말한다.',
      '',
      '=== 문서 ===',
      context,
    ].join('\n')

    const system = [commonSystem, ragSystem].filter(Boolean).join('\n\n')

    this.logger.log(
      `[ragService] prompt-apply collection=${usedCollection ?? '-'} commonSystemApplied=${Boolean(commonSystem)} systemLen=${system.length}`,
    )
    this.logger.log(`[ragService] prompt-apply commonSystemText=${JSON.stringify(commonSystem)}`)

    this.logger.log(`[ragService] system ${system}`)

    const res = await this.client.generateContent({
      messages: [
        { role: 'system', content: system },
        ...history.map((t) => ({ role: t.role, content: t.content })),
        { role: 'user', content: message },
      ],
      maxOutputTokens: this.maxOutputTokens,
    })

    const text = (res.text ?? '').trim()
    return {
      text: text || fallbackText,
      usedCollection,
      usedChunks: hits.map((h) => h.chunk.id),
    }
  }
}
