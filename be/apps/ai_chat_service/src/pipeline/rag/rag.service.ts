/**
 * RAG 서비스 (키워드 검색 + 근거 기반 답변).
 *
 * 1) retrieve: 발화를 토큰화해 컬렉션 청크와 키워드/본문 겹침으로 점수화 → 상위 K개.
 * 2) answer: 검색된 청크를 컨텍스트로 LLM에 넣어, 문서 근거로만 답하게 한다.
 */
import type { LlmClient } from '../../llm/llm.types'
import type { RagChunk } from './rag.docs'
import type { ChatTurn, RagScoreEntry } from '../pipeline.types'
import { getPromptStore } from '../../features/chat/service/prompt-store.service'

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
  const tokenLooselyMatches = (left: string, right: string): boolean => {
    if (!left || !right) return false
    if (left === right) return true

    // ASCII 토큰(예: ifthen vs ifthenelse)은 부분 일치로 보지 않는다.
    if (isAsciiToken(left) && isAsciiToken(right) && left.length >= 4 && right.length >= 4) {
      return false
    }

    return left.includes(right) || right.includes(left)
  }

  const keywordTokenLooselyMatches = (keyword: string): boolean => {
    const keywordTokens = tokenize(keyword)
    if (keywordTokens.length === 0) return false

    return queryTokens.some((queryToken) => keywordTokens.some((keywordToken) => {
      return tokenLooselyMatches(queryToken, keywordToken)
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
    if (haystackTokens.has(t)) {
      score += 0.5
      continue
    }

    const hasLooseHit = Array.from(haystackTokens).some((haystackToken) => tokenLooselyMatches(t, haystackToken))
    if (hasLooseHit) score += 0.25
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

export type RagSelectionConfig = {
  topK: number
  minScore: number
  screenBonus: number
}

type RagCollectionEval = {
  collection: string
  hits: RetrievedChunk[]
  topScore: number
  adjustedScore: number
  hitCount: number
  topChunks: Array<{ chunkKey: string; finalScore: number; rawScore: number }>
  topChunkIds: string[]
  relaxed: boolean
}

export class RagService {
  constructor(
    private readonly client: LlmClient,
    private readonly maxOutputTokens: number,
    private readonly selection: RagSelectionConfig,
    private readonly logger: RagLogger,
  ) { }

  private stageLog(stage: string, status: string, reason: string, reqId = '-') {
    void stage
    void status
    void reason
    void reqId
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

    return undefined
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
      .slice(0, this.selection.topK)
  }

  private evaluateCollection(collectionName: string, query: string, intentType?: RagIntentType): RagCollectionEval | null {
    const resolvedCollection = this.resolveCollection(collectionName)
    if (!resolvedCollection) return null

    let hits = this.retrieve(collectionName, query, intentType)
    let relaxed = false

    if (hits.length === 0 && intentType) {
      const relaxedHits = this.retrieve(collectionName, query)
      if (relaxedHits.length > 0) {
        hits = relaxedHits
        relaxed = true
      }
    }

    const topScore = hits[0]?.score ?? 0
    const collectionBonus = collectionName === 'common' ? 0 : this.selection.screenBonus
    const adjustedScore = topScore + collectionBonus
    const topChunks = hits.slice(0, this.selection.topK).map((row) => ({
      chunkKey: row.chunk.id,
      finalScore: row.score + collectionBonus,
      rawScore: row.score,
    }))

    return {
      collection: collectionName,
      hits,
      topScore,
      adjustedScore,
      hitCount: hits.length,
      topChunks,
      topChunkIds: hits.slice(0, this.selection.topK).map((row) => row.chunk.id),
      relaxed,
    }
  }

  private findChunkByIdInCollection(
    collectionName: string,
    chunkId: string,
    intentType?: RagIntentType,
  ): { collection: string; chunk: RagChunk } | null {
    const collection = this.resolveCollection(collectionName)
    if (!collection) return null

    const targetId = String(chunkId ?? '').trim()
    if (!targetId) return null

    const found = collection.chunks.find((chunk) => {
      if (chunk.id !== targetId) return false
      return this.supportsIntent(chunk, intentType)
    })

    if (!found) return null
    return { collection: collectionName, chunk: found }
  }

  private resolveChunksByIds(
    collectionNames: string[],
    chunkIds: string[],
    intentType?: RagIntentType,
  ): Array<{ collection: string; chunk: RagChunk }> {
    const results: Array<{ collection: string; chunk: RagChunk }> = []
    const seenChunkIds = new Set<string>()

    for (const rawChunkId of chunkIds) {
      const chunkId = String(rawChunkId ?? '').trim()
      if (!chunkId || seenChunkIds.has(chunkId)) continue

      for (const collectionName of collectionNames) {
        const matched = this.findChunkByIdInCollection(collectionName, chunkId, intentType)
        if (!matched) continue

        seenChunkIds.add(chunkId)
        results.push(matched)
        break
      }
    }

    return results
  }

  async answerFromChunkKeys(
    collectionNames: string | string[],
    chunkKeys: string[],
    message: string,
    history: ChatTurn[] = [],
    reqId = '-',
    options?: { intentType?: RagIntentType },
  ): Promise<{ text: string; usedCollection?: string; primaryChunkKey?: string; usedChunks: string[]; ragScores: RagScoreEntry[] }> {
    const names = Array.isArray(collectionNames) ? collectionNames : [collectionNames]
    const targetChunkKeys = Array.from(new Set(chunkKeys.map((k) => String(k ?? '').trim()).filter(Boolean)))
    if (targetChunkKeys.length === 0) {
      return { text: '', usedChunks: [], ragScores: [] }
    }

    let matchedChunks = this.resolveChunksByIds(names, targetChunkKeys, options?.intentType)
    if (matchedChunks.length === 0 && options?.intentType) {
      matchedChunks = this.resolveChunksByIds(names, targetChunkKeys)
    }

    if (matchedChunks.length === 0) {
      return { text: '', usedChunks: [], ragScores: [] }
    }

    const usedChunkIds = matchedChunks.map((row) => row.chunk.id)
    const primaryChunkKey = usedChunkIds[0]
    const uniqueCollections = Array.from(new Set(matchedChunks.map((row) => row.collection)))
    const usedCollection = uniqueCollections.length === 1 ? uniqueCollections[0] : uniqueCollections[0]

    const context = matchedChunks
      .map((row, i) => `[문서 ${i + 1}] ${row.chunk.title}\n${row.chunk.body}`)
      .join('\n\n')

    const commonSystem = getPromptStore()?.getPromptContent('common', 'system') ?? ''
    const system = [commonSystem, context].filter(Boolean).join('\n\n')

    this.logger.log?.(
      `================= [3-3-2단계:RAG_청크강제폴백] [reqId=${reqId}] chunkKeys=${JSON.stringify(targetChunkKeys)} matchedChunks=${JSON.stringify(usedChunkIds)} collections=${JSON.stringify(uniqueCollections)}`,
    )

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
      text,
      usedCollection,
      primaryChunkKey,
      usedChunks: usedChunkIds,
      ragScores: [],
    }
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
  ): Promise<{ text: string; usedCollection?: string; primaryChunkKey?: string; usedChunks: string[]; ragScores: RagScoreEntry[] }> {
    const names = Array.isArray(collectionNames) ? collectionNames : [collectionNames]

    this.stageLog('3-1단계:RAG_컬렉션후보', 'loaded', `후보 컬렉션 ${names.length}개를 순차 탐색`, reqId)
    this.logger.log?.(
      `================= [3-1단계:RAG_컬렉션후보_추적] [reqId=${reqId}] names=${JSON.stringify(names)} messageLen=${String(message ?? '').length} historyTurns=${history.length}`,
    )
    const evaluated = names
      .map((name) => this.evaluateCollection(name, message, options?.intentType))
      .filter((item): item is RagCollectionEval => Boolean(item))

    const ragScores: RagScoreEntry[] = evaluated.map((item) => ({
      collection: item.collection,
      topScore: item.topScore,
      adjustedScore: item.adjustedScore,
      hitCount: item.hitCount,
      topChunks: item.topChunks,
      topChunkIds: item.topChunkIds,
      relaxed: item.relaxed,
    }))

    for (const item of evaluated) {
      const resolvedCollection = this.resolveCollection(item.collection)
      this.stageLog(
        '3-1-1단계:RAG_컬렉션상태',
        resolvedCollection ? 'ready' : 'missing',
        `collection=${item.collection} 존재 여부 확인`,
        reqId,
      )
      this.stageLog(
        '3-2단계:RAG_컬렉션탐색',
        item.hitCount > 0 ? 'matched' : 'miss',
        `collection=${item.collection} 탐색 완료(hitCount=${item.hitCount})`,
        reqId,
      )
      this.logger.log?.(
        `================= [3-2단계:RAG_컬렉션탐색_추적] [reqId=${reqId}] collection=${item.collection} intent=${options?.intentType ?? 'any'} topScore=${item.topScore} adjustedScore=${item.adjustedScore} hits=${JSON.stringify(item.hits.map((row) => ({ id: row.chunk.id, score: row.score })))}`,
      )
      if (item.relaxed) {
        this.stageLog(
          '3-2-1단계:RAG_의도완화재탐색',
          'matched',
          `collection=${item.collection} intent=${options?.intentType} 조건 미일치로 무의도 재탐색(hitCount=${item.hitCount})`,
          reqId,
        )
      }
    }

    const eligible = evaluated.filter((item) => item.topScore >= this.selection.minScore)
    const ranked = (eligible.length > 0 ? eligible : []).sort((a, b) => {
      if (b.adjustedScore !== a.adjustedScore) return b.adjustedScore - a.adjustedScore
      if (b.topScore !== a.topScore) return b.topScore - a.topScore
      return a.collection.localeCompare(b.collection)
    })

    const selected = ranked[0]
    if (!selected) {
      this.stageLog('3-3단계:RAG_탐색결과', 'empty', `모든 컬렉션이 임계 스코어(${this.selection.minScore}) 미만`, reqId)
      return { text: '', usedChunks: [], ragScores }
    }

    const hits = selected.hits
    const usedCollection = selected.collection
    const primaryChunkKey = hits[0]?.chunk?.id

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
    this.logger.log?.(
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
    this.logger.log?.(
      `================= [3-6단계:RAG_응답생성완료_추적] [reqId=${reqId}] textLength=${text.length} usedChunks=${JSON.stringify(hits.map((h) => h.chunk.id))}`,
    )
    return {
      text,
      usedCollection,
      primaryChunkKey,
      usedChunks: hits.map((h) => h.chunk.id),
      ragScores,
    }
  }
}
