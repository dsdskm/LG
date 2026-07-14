// analysisConfig.js
// 분석 임계값(추정/휴리스틱)의 "기본값"과 설정 UI 메타데이터를 한 곳에서 관리.
// ⚠️ 여기 값들은 실제 사양/검증 기준이 아니라 화면 표시용 "추정 기준"입니다.
//    사용자가 설정 UI(⚙)에서 바꾸면 localStorage에 저장되고, 안 바꾸면 이 기본값이 그대로 쓰입니다.

export const DEFAULT_ANALYSIS_THRESHOLDS = {
  // 팔(Arm) 관절 분석
  arm: {
    jointVelWarn: 1.2, // rad/s — 관절 상태 WARN(🟡) 색상
    jointVelError: 2.5, // rad/s — 관절 상태 ERROR(🔴)
    jointEffWarn: 4.0, // effort — WARN
    jointEffError: 8.0, // effort — ERROR
    eventVelWarn: 1.8, // rad/s — 자동 이벤트(velocity spike)  [UI 비노출]
    eventEffWarn: 6.0, // effort — 자동 이벤트(effort spike)    [UI 비노출]
    smoothnessK: 0.8, // smoothPct = 100*exp(-K*velRMS) 의 K   [UI 비노출]
    smoothnessWarnPct: 70, // 이 % 미만이면 경고색
    velPeakWarn: 1.8 // rad/s — vel peak 배지 경고             [UI 비노출]
  },
  // 손(End-Effector) 분석
  hand: {
    staticVel: 0.02, // rad/s — 이하면 "정지"로 간주            [UI 비노출]
    moveDeltaPct: 4.0, // 0.4s 기준 이 % 이상 변하면 동작        [UI 비노출]
    graspCurlPct: 70, // Curl% 이상 + 정지 → "Grasp(추정)"
    curlWarnPct: 90, // 손가락 Curl% 경고
    asymWarnPct: 50 // 손 비대칭 % 경고
  },
  // 제어 성능(Performance)
  perf: {
    posOkRad: 0.15, // |pos error| 이하면 성공으로 카운트
    peakWarnRad: 0.3 // peak error 이 값 초과면 경고 배지
  }
}

// 설정 UI에 노출할 필드(자주 조정하는 "판정 기준"만 선별). 나머지는 기본값 사용.
export const THRESHOLD_FIELDS = [
  {
    group: 'arm',
    label: '팔 관절',
    fields: [
      { key: 'jointVelWarn', label: '속도 경고', unit: 'rad/s', step: 0.1, min: 0 },
      { key: 'jointVelError', label: '속도 오류', unit: 'rad/s', step: 0.1, min: 0 },
      { key: 'jointEffWarn', label: 'effort 경고', unit: '', step: 0.5, min: 0 },
      { key: 'jointEffError', label: 'effort 오류', unit: '', step: 0.5, min: 0 },
      { key: 'smoothnessWarnPct', label: 'Smoothness 경고', unit: '%', step: 1, min: 0, max: 100 }
    ]
  },
  {
    group: 'hand',
    label: '손(End-Effector)',
    fields: [
      { key: 'graspCurlPct', label: 'Grasp 판정 Curl', unit: '%', step: 1, min: 0, max: 100 },
      { key: 'curlWarnPct', label: 'Curl 경고', unit: '%', step: 1, min: 0, max: 100 },
      { key: 'asymWarnPct', label: '비대칭 경고', unit: '%', step: 1, min: 0, max: 100 }
    ]
  },
  {
    group: 'perf',
    label: '제어 성능',
    fields: [
      { key: 'posOkRad', label: '성공 기준(pos err)', unit: 'rad', step: 0.01, min: 0 },
      { key: 'peakWarnRad', label: 'peak 경고', unit: 'rad', step: 0.01, min: 0 }
    ]
  }
]

// 사용자 override(부분 객체)를 기본값과 병합해 항상 완전한 형태를 보장.
export function mergeThresholds(overrides) {
  const o = overrides || {}
  const d = DEFAULT_ANALYSIS_THRESHOLDS
  return {
    arm: { ...d.arm, ...(o.arm || {}) },
    hand: { ...d.hand, ...(o.hand || {}) },
    perf: { ...d.perf, ...(o.perf || {}) }
  }
}
