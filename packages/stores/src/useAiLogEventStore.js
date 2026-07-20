import { create } from 'zustand'

/**
 * AI 로그 이벤트 탭과 챗봇 사이의 필터 브릿지.
 *
 * 챗봇이 데이터 조회 인텐트(chat_action: 'ailog/event/filter')를 처리하면
 * requestFilters 로 필터를 넣고, 이벤트 탭(useAiLogData)이 이를 소비해 표에 적용한다.
 *
 * pendingFilters 키는 useAiLogData 의 필터 키와 동일:
 *   { startDate, endDate, severity, func, status, searchQuery }
 */
export const useAiLogEventStore = create((set) => ({
  pendingFilters: null,
  /** 챗봇 → 이벤트 탭: 적용할 필터 요청. _ts 로 동일 값 재요청도 트리거되게 함. */
  requestFilters: (filters) =>
    set({ pendingFilters: { ...filters, _ts: Date.now() } }),
  /** 이벤트 탭이 소비 후 비운다. */
  clearPendingFilters: () => set({ pendingFilters: null })
}))
