/** (이 파일 하단 주석 참조) guidance 키워드 매칭 유틸. */
/**
 * 안내(guidance) 공통 유틸.
 *
 * 데이터 조회/액션 없이 "화면의 해당 영역에서 직접 확인하도록 안내"하는
 * 동작은 모든 화면에 공통이다.
 *
 * LLM에 보낼 긴 프롬프트를 만들지 않고,
 * 사용자 질문을 예시/영역 기준으로 간단히 분류해서 즉시 안내 문구를 반환한다.
 */

export type GuidanceSection = {
  /** 영역 이름 */
  name: string
  /** 영역 설명 */
  desc: string
  /** 이 영역으로 분류할 키워드 목록 */
  keywords?: string[]
}

export type GuidanceExample = {
  /** 예시 질문 */
  q: string
  /** 예시 답변 */
  a: string
  /** 이 예시로 분류할 키워드 목록 */
  keywords?: string[]
}

export type GuidanceParams = {
  /** 현재 화면 이름 */
  screenName: string
  /** 화면을 구성하는 영역 목록 */
  sections: GuidanceSection[]
  /** 예시 답변 목록 */
  examples?: GuidanceExample[]
  /** 사용자 메시지 */
  msg: string
  /** 화면과 무관한 질문일 때 반환할 문구 */
  fallbackText?: string
}

const DEFAULT_FALLBACK_TEXT = '현재 화면과 관련된 질문만 안내해 드릴 수 있습니다.'

function normalizeText(value: string): string {
  return value
    .toLowerCase()
    .replace(/\s+/g, '')
    .replace(/[?!.。,，"'“”‘’`~]/g, '')
}

function getKeywordScore(msg: string, keywords: string[]): number {
  const normalizedMsg = normalizeText(msg)

  return keywords.reduce((score, keyword) => {
    const normalizedKeyword = normalizeText(keyword)

    if (!normalizedKeyword) {
      return score
    }

    return normalizedMsg.includes(normalizedKeyword) ? score + 1 : score
  }, 0)
}

function getTextSimilarityScore(msg: string, target: string): number {
  const normalizedMsg = normalizeText(msg)
  const normalizedTarget = normalizeText(target)

  if (!normalizedMsg || !normalizedTarget) {
    return 0
  }

  if (normalizedMsg === normalizedTarget) {
    return 100
  }

  if (normalizedMsg.includes(normalizedTarget) || normalizedTarget.includes(normalizedMsg)) {
    return 50
  }

  return 0
}

function findBestExample(msg: string, examples: GuidanceExample[]): GuidanceExample | null {
  let bestExample: GuidanceExample | null = null
  let bestScore = 0

  examples.forEach((example) => {
    const exactScore = getTextSimilarityScore(msg, example.q)
    const keywordScore = getKeywordScore(msg, example.keywords ?? [])
    const totalScore = exactScore + keywordScore

    if (totalScore > bestScore) {
      bestScore = totalScore
      bestExample = example
    }
  })

  return bestScore > 0 ? bestExample : null
}

function findBestSection(msg: string, sections: GuidanceSection[]): GuidanceSection | null {
  let bestSection: GuidanceSection | null = null
  let bestScore = 0

  sections.forEach((section) => {
    const keywords = [section.name, section.desc, ...(section.keywords ?? [])]
    const score = getKeywordScore(msg, keywords)

    if (score > bestScore) {
      bestScore = score
      bestSection = section
    }
  })

  return bestScore > 0 ? bestSection : null
}

function buildSectionGuideAnswer(screenName: string, sectionName: string): string {
  return `${sectionName}은 ${screenName} 화면의 "${sectionName}" 영역에서 직접 확인해 주세요.`
}

export function buildGuidanceAnswer({
  screenName,
  sections,
  examples = [],
  msg,
  fallbackText = DEFAULT_FALLBACK_TEXT,
}: GuidanceParams): string {
  const trimmedMsg = msg.trim()

  if (!trimmedMsg) {
    return fallbackText
  }

  const matchedExample = findBestExample(trimmedMsg, examples)

  if (matchedExample) {
    return matchedExample.a
  }

  const matchedSection = findBestSection(trimmedMsg, sections)

  if (matchedSection) {
    return buildSectionGuideAnswer(screenName, matchedSection.name)
  }

  return fallbackText
}

/**
 * 기존 코드 호환용.
 * 신규 코드는 buildGuidanceAnswer 사용 권장.
 */
export function buildGuidancePrompt(params: GuidanceParams): string {
  return buildGuidanceAnswer(params)
}