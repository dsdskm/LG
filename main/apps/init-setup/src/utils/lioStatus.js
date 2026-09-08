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

/**
 * 상태 값 → 상태 배지에 쓸 번역 키(map 네임스페이스의 lioStatus.*).
 *
 * 발행되는 값은 로봇 구현 용어다(relocalizing_gkr, loading_grid_map …) — 그대로 띄우면 조작자가
 * 지금 무엇을 기다려야 하는지 읽을 수 없다. 값의 목록은 LIO_STATUS.md 의 계약이다.
 *
 * relocalizing_gkr 만 라벨에 "회전 필요" 를 덧붙인다 — 이 단계는 로봇이 제자리에서 한 바퀴 돌아야
 * 진행되고(약 310°), 회전은 사용자가 회전 버튼으로 시작해야 하므로 상태 자체가 할 일을 말해야 한다.
 */
const LABEL_KEY_BY_STATUS = {
  mapping: 'lioStatus.mapping',
  saving_map: 'lioStatus.savingMap',
  loading_map: 'lioStatus.loadingMap',
  relocalizing_pose: 'lioStatus.relocalizingPose',
  relocalizing_gkr: 'lioStatus.relocalizingGkr',
  loading_grid_map: 'lioStatus.loadingGridMap',
  recovering: 'lioStatus.recovering',
  ready: 'lioStatus.ready',
  failed: 'lioStatus.failed'
}

/**
 * 상태 배지에 보여줄 문구. 아직 상태를 못 받았으면 대기 문구를, 목록에 없는 값이면 원문을 그대로
 * 돌려준다 — 로봇 쪽에 상태가 새로 늘었을 때 배지에서 사라지는 것보다 낫다(원문이라도 보여야
 * 무슨 일이 일어났는지 알 수 있다).
 *
 * @param {string|null|undefined} status /lio_node/status 의 data 값
 * @param {(key: string) => string} t map 네임스페이스의 번역 함수
 */
export const resolveStatusLabel = (status, t) => {
  const value = String(status ?? '').trim()
  if (!value) return t('waitingForData')
  const key = LABEL_KEY_BY_STATUS[value]
  return key ? t(key) : value
}
