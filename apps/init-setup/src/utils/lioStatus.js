/**
 * /lio_node/status 문자열 → 화면이 쓰는 모드.
 *
 * lio_node 는 진행 상태를 세분해서 발행하지만(LIO_STATUS.md), UI 가 실제로 구분해야 하는 것은
 * "지금 어떤 세션인가"다. 상태 값이 늘어나도 화면 분기가 늘지 않도록 여기서 한 번 접는다.
 *
 *   mapping        : 매핑 세션 진행 중 — 저장/재시작/취소가 의미 있다
 *   saving         : /save_map 처리 중 — 매핑 세션이지만 저장 중복 호출을 막아야 한다
 *   localization   : 측위 세션(맵 로드~재정위~ready) — 매핑 조작 대신 주행이 의미 있다
 *   failed         : 맵 로드/저장 실패
 *   unknown        : 상태 토픽을 아직 못 받음(미연결·미구독·LIO 없음) — 판정 불가
 */
const MODE_BY_STATUS = {
  mapping: 'mapping',
  saving_map: 'saving',
  loading_map: 'localization',
  relocalizing_pose: 'localization',
  relocalizing_gkr: 'localization',
  loading_grid_map: 'localization',
  recovering: 'localization',
  ready: 'localization',
  failed: 'failed'
}

/**
 * @param {string|null|undefined} status /lio_node/status 의 data 값
 * @returns {'mapping'|'saving'|'localization'|'failed'|'unknown'}
 */
export const resolveMappingMode = (status) => {
  if (!status) return 'unknown'
  return MODE_BY_STATUS[String(status).trim()] ?? 'unknown'
}

/** 매핑 세션(저장 전) 인지 — 저장/재시작/취소를 노출할 조건. */
export const isMappingSession = (mode) => mode === 'mapping' || mode === 'saving'
