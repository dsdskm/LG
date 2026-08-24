import { create } from 'zustand'
import { persist } from 'zustand/middleware'

/**
 * 위치 계층(Building > Floor > Area) 선택 스토어.
 *
 * 맵 스캔 화면과 시맨틱 화면이 같은 작업 위치를 다루는데, 지금까지는 각 페이지의 로컬 state 라
 * 화면을 옮기거나 새로고침하면 선택이 풀리고 매번 자동 선택(첫 항목)부터 다시 시작했다.
 * 여기에 담아 두면 두 화면이 같은 선택을 공유하고, 새로고침 후에도 이어서 작업할 수 있다.
 *
 * localStorage 에 남기는 값은 id 세 개뿐이다(이름/목록은 매번 API 로 다시 받는다) — 저장된 id 가
 * 삭제되었을 수 있으므로 소비 측은 목록을 받은 뒤 pruneMissing 으로 검증해야 한다.
 */
const EMPTY = { buildingId: '', floorId: '', areaId: '' }

export const useLocationStore = create(
  persist(
    (set) => ({
      ...EMPTY,

      /**
       * 선택 갱신. LocationBar 의 onChange 는 상위가 바뀌면 하위를 '' 로 비운 객체를 넘기므로
       * 그 값을 그대로 반영하면 계층 초기화 규칙이 유지된다.
       * @param {{buildingId?: string|number, floorId?: string|number, areaId?: string|number}} next
       */
      setLocation: (next) => set((prev) => ({ ...prev, ...next })),

      /** 한 계층만 채운다. 이미 값이 있으면 덮어쓰지 않는다(자동 선택용). */
      setLevelIfEmpty: (key, value) => set((prev) => (prev[key] ? prev : { ...prev, [key]: value })),

      /**
       * 저장된 id 가 현재 목록에 없으면 그 계층부터 비운다(하위도 함께).
       * 건물이 삭제·교체된 뒤 새로고침하면 없는 id 가 남아 화면이 빈 상태로 멈추는 것을 막는다.
       * @param {'buildingId'|'floorId'|'areaId'} key
       * @param {object[]} items 해당 계층의 조회 결과
       */
      pruneMissing: (key, items) =>
        set((prev) => {
          const selected = prev[key]
          if (!selected || items.some((item) => String(item.id) === String(selected))) return prev
          // 상위가 무효면 하위 선택도 의미가 없다.
          if (key === 'buildingId') return { ...prev, ...EMPTY }
          if (key === 'floorId') return { ...prev, floorId: '', areaId: '' }
          return { ...prev, areaId: '' }
        }),

      clearLocation: () => set({ ...EMPTY })
    }),
    {
      name: 'STORE_INIT_SETUP_LOCATION',
      partialize: (state) => ({
        buildingId: state.buildingId,
        floorId: state.floorId,
        areaId: state.areaId
      })
    }
  )
)
