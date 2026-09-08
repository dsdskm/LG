import { ensurePeriodInEventReply, ensureUserFacingReply, toDisplayText } from './reply-text.util'

describe('ensureUserFacingReply', () => {
  it('개발자 포맷 intent json 대신 reason 문장만 보여 준다', () => {
    const result = ensureUserFacingReply({
      chat_action: 'info',
      text: '{"intent":"info","confidence":1.0,"reason":"TaskFlow 배포 방법을 설명합니다."}',
    } as any)

    expect(result.text).toBe('TaskFlow 배포 방법을 설명합니다.')
    expect(result.text).not.toContain('confidence')
  })

  it('RAG 디버그 문자열은 사용자 문장으로 바꾼다', () => {
    const result = ensureUserFacingReply({
      chat_action: 'info',
      text: 'matchScore=0.91 adjustedScore=1.02 thresholdScore=0.00 selected=common selectedChunks=[chunk-1]',
    } as any)

    expect(result.text).toBe('질문과 관련된 내용을 확인해서 답변을 정리해봤어요.')
  })

  it('평범한 한국어 문장은 그대로 둔다', () => {
    const text = '운영 관제는 로봇 관리, SOTA, CMS, TMS, 학습 기능 등을 제공한다.'
    expect(ensureUserFacingReply({ chat_action: 'info', text } as any).text).toBe(text)
  })

  it('본문 앞에 붙은 소개성 문구는 떼어 낸다', () => {
    const result = ensureUserFacingReply({
      chat_action: 'info',
      text: '죄송합니다. 제공된 문서에는 배포 관련 정보가 없습니다. TaskFlow 배포는 목록 화면에서 배포 버튼을 누르면 시작됩니다.',
    } as any)

    expect(result.text).toBe('TaskFlow 배포는 목록 화면에서 배포 버튼을 누르면 시작됩니다.')
  })

  it('문장이 비면 화면 이동 안내로 대신 채운다', () => {
    const result = ensureUserFacingReply({
      chat_action: 'navigation',
      chat_action_param: { path: '/tms/robots' },
      text: '',
    } as any)

    expect(result.text).toBe('tms/robots 화면으로 이동을 준비했어요.')
  })
})

describe('ensurePeriodInEventReply', () => {
  it('이벤트 조회 응답에 기간 안내를 한 번만 붙인다', () => {
    const reply = {
      chat_action: 'ailog/event/filter',
      chat_action_param: { filters: { startDate: '2026-09-01', endDate: '2026-09-08' } },
      text: '총 3건입니다.',
    } as any

    const first = ensurePeriodInEventReply(reply)
    expect(first.text).toBe('조회 기간은 2026-09-01 ~ 2026-09-08입니다. 총 3건입니다.')
    expect(ensurePeriodInEventReply(first).text).toBe(first.text)
  })
})

describe('toDisplayText', () => {
  it('이벤트 집계 객체는 요약 문장으로 옮긴다', () => {
    const text = toDisplayText({ totalCount: 3, actionCompletedCount: 1, analysisCompletedCount: 2, analysisFailedCount: 0 })
    expect(text).toContain('총 3건입니다.')
  })

  it('문장이 담긴 키를 골라 쓴다', () => {
    expect(toDisplayText({ summary: '요약입니다.' })).toBe('요약입니다.')
  })
})
