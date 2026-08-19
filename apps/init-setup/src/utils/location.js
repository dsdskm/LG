/**
 * 위치 계층(Building > Floor > Area) 선택 보조.
 *
 * 맵 스캔 / 시맨틱 화면 모두 진입 직후 작업 대상 위치가 정해져 있어야 한다
 * (스캔은 맵 이름이 곧 위치, 시맨틱은 POI 소속 맵을 찾는 기준). 선택값 자체는
 * stores/useLocationStore 가 들고 있고(새로고침·화면 이동에도 유지), 여기서는
 * "조회 결과를 받은 뒤 무엇을 채울지" 규칙만 담는다.
 */

/**
 * 한 계층의 조회 결과를 선택 상태와 맞춘다.
 *
 *  1) 저장돼 있던 id 가 목록에 없으면 비운다(삭제된 건물/층을 가리키고 있던 경우).
 *  2) 그래도 비어 있으면 첫 항목으로 자동 선택한다 — 상위가 정해지면 하위 조회가 이어져
 *     Building → Floor → Area 가 차례로 채워진다.
 *
 * 두 동작 모두 이미 유효한 선택은 건드리지 않으므로, 사용자가 고른 값이나 이전 세션에서
 * 이어받은 값이 자동 선택으로 덮이지 않는다.
 *
 * @param {{pruneMissing: Function, setLevelIfEmpty: Function}} actions useLocationStore 액션
 * @param {'buildingId'|'floorId'|'areaId'} key 채울 계층
 * @param {object[]} items 조회된 목록 (백엔드 레코드 그대로)
 */
export const syncLevelSelection = (actions, key, items) => {
  actions.pruneMissing(key, items)
  if (items.length) actions.setLevelIfEmpty(key, items[0].id)
}
