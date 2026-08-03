export type RagChunk = {
  id: string
  title: string
  /** 검색 가중치를 높일 핵심 키워드. */
  keywords: string[]
  body: string
  intentType?: 'info' | 'action' | 'both'
}
