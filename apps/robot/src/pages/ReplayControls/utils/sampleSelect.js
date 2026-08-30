// utils/sampleSelect.js
// wrapped 샘플 배열({ tSec, msg } 또는 msg-only)에서 시간(상대초) 기준 조회 (이진탐색).
// 이전엔 각 분석 탭(Arm/EndEffector/Performance/SystemStatus)에 동일 로직이 복붙되어 있었음 → 공용화.

// currentTime(상대초)에 해당하는 msg 선택: tSec <= currentTime 인 마지막 샘플.
// - tSec가 없거나 msg-only 배열이면: totalDuration이 있으면 비율로, 없으면 마지막으로 폴백.
export function selectSampleAtTime(wrapped, currentTime, totalDuration) {
  if (!Array.isArray(wrapped) || wrapped.length === 0) return null

  const first = wrapped[0]
  const last = wrapped[wrapped.length - 1]
  const looksWrapped = first && typeof first === 'object' && ('msg' in first || 'tSec' in first)
  const firstTSec = looksWrapped ? first?.tSec : null

  const dur = Number(totalDuration || 0)
  const target = Number(currentTime || 0)

  // Fallback: tSec 없음 or msg-only 배열
  if (!looksWrapped || firstTSec == null) {
    if (dur > 0) {
      const r = Math.min(1, Math.max(0, target / dur))
      const idx = Math.round(r * (wrapped.length - 1))
      const picked = wrapped[idx]
      return picked?.msg ?? picked ?? null
    }
    return last?.msg ?? last ?? null
  }

  // tSec(상대초) <= currentTime(상대초) 인 마지막 인덱스
  let lo = 0
  let hi = wrapped.length - 1
  let ans = 0
  while (lo <= hi) {
    const mid = (lo + hi) >> 1
    const t = wrapped[mid]?.tSec
    if (typeof t === 'number' && t <= target) {
      ans = mid
      lo = mid + 1
    } else {
      hi = mid - 1
    }
  }
  return wrapped[ans]?.msg ?? null
}

// tSec 기준 인덱스 찾기: tSec <= 인 마지막 인덱스.
// - 데이터 없으면 -1, 비-wrapped(또는 tSec 비유한)면 마지막 인덱스로 폴백.
export function indexAtTime(wrapped, tSec) {
  if (!Array.isArray(wrapped) || wrapped.length === 0) return -1

  const first = wrapped[0]
  const looksWrapped = first && typeof first === 'object' && ('msg' in first || 'tSec' in first)
  const firstTSec = looksWrapped ? first?.tSec : null

  if (!looksWrapped || firstTSec == null || typeof tSec !== 'number') return wrapped.length - 1

  let lo = 0
  let hi = wrapped.length - 1
  let ans = 0
  while (lo <= hi) {
    const mid = (lo + hi) >> 1
    const tt = wrapped[mid]?.tSec
    if (typeof tt === 'number' && tt <= tSec) {
      ans = mid
      lo = mid + 1
    } else hi = mid - 1
  }
  return ans
}
