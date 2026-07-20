// components/urdf/jointStateBinding.js

/**
 * jointStateBinding
 * - MCAP joint_states samples + currentTime(sec) -> nearest sample 선택
 * - URDFLoader robot.joints[name].setJointValue(position) 적용
 *
 * IMPORTANT:
 * - ROS2 JointState.position은 Array가 아니라 Float64Array(TypedArray)인 경우가 많음
 *   → Array.isArray로만 검사하면 적용이 "항상 스킵"될 수 있음.
 */

function isArrayLike(v) {
  // Array, TypedArray(Float64Array 등), arguments, etc.
  return Array.isArray(v) || ArrayBuffer.isView(v)
}

export function extractJointStateMsg(sample) {
  return sample?.msg ?? sample?.message ?? sample
}

export function getSampleRelTimeSec(sample, timeRange) {
  if (!sample) return 0

  // bucket-sampled에서 흔히 쓰는 상대 시간 필드 후보들
  const cand = sample.relSec ?? sample.rel ?? sample.tRel ?? sample.relTime ?? sample.timeSec ?? sample.t

  if (Number.isFinite(cand)) return cand

  // 절대 time stamp 기반이면 timeRange.startSec로 상대 시간 계산
  const msg = extractJointStateMsg(sample)
  const stampSec = msg?.headerStampSec ?? msg?.stampSec ?? sample?.headerStampSec ?? sample?.stampSec

  if (Number.isFinite(stampSec) && timeRange && Number.isFinite(timeRange.startSec)) {
    return stampSec - timeRange.startSec
  }

  return 0
}

// jointStateBinding.js (또는 pickNearest가 정의된 파일)
// ✅ tSec wrapper({tSec,msg}) 지원 + 이진탐색
export function pickNearestJointStateSample(samples, currentTime /* relSec */, timeRange) {
  if (!Array.isArray(samples) || samples.length === 0) return null
  const t = Number(currentTime)
  if (!Number.isFinite(t)) return null

  const first = samples[0]
  const looksWrapped = first && typeof first === 'object' && typeof first.tSec === 'number'

  // ✅ 1) samples = [{tSec,msg}, ...] 인 경우: tSec 기준(상대초) 이진탐색
  if (looksWrapped) {
    let lo = 0
    let hi = samples.length - 1
    let ans = 0

    while (lo <= hi) {
      const mid = (lo + hi) >> 1
      const tt = samples[mid]?.tSec
      if (typeof tt === 'number' && tt <= t) {
        ans = mid
        lo = mid + 1
      } else {
        hi = mid - 1
      }
    }

    const picked = samples[ans]
    return { index: ans, sample: picked?.msg ?? picked }
  }

  // ✅ 2) fallback: msg-only 배열일 때는 그냥 비율로 추정(최후 수단)
  // (원래 구현이 있었을 텐데, 최소한 '항상 마지막'으로 붙는 버그는 막아줌)
  const dur = timeRange && Number.isFinite(timeRange.endSec) ? Number(timeRange.endSec) : null
  if (dur && dur > 0) {
    const r = Math.min(1, Math.max(0, t / dur))
    const idx = Math.min(samples.length - 1, Math.max(0, Math.round(r * (samples.length - 1))))
    return { index: idx, sample: samples[idx] }
  }

  return { index: samples.length - 1, sample: samples[samples.length - 1] }
}

/**
 * URDF 로봇에 joint_state 적용
 * @param robot URDFLoader robot (robot.joints dict)
 * @param jointStateSampleOrMsg sample 또는 msg
 * @param options
 *  - nameTransform: (name)=>name
 *  - onStats: (stats)=>void
 *
 * stats:
 *  { matched, missing, total, reason? }
 */
export function applyJointStateToRobot(robot, jointStateSampleOrMsg, options = {}) {
  const { nameTransform, onStats } = options

  // reason을 onStats로도 보내서 "왜 로그가 안 떴는지"를 제거
  const emit = (stats) => {
    if (typeof onStats === 'function') onStats(stats)
    return stats
  }

  if (!robot?.joints) return emit({ matched: 0, missing: 0, total: 0, reason: 'robot.joints missing' })

  const msg = extractJointStateMsg(jointStateSampleOrMsg)

  const names = msg?.name
  const pos = msg?.position

  if (!Array.isArray(names)) {
    return emit({
      matched: 0,
      missing: 0,
      total: 0,
      reason: `msg.name not Array (type=${typeof names})`
    })
  }

  if (!isArrayLike(pos)) {
    return emit({
      matched: 0,
      missing: 0,
      total: names.length || 0,
      reason: `msg.position not ArrayLike (Array/TypedArray). got=${Object.prototype.toString.call(pos)}`
    })
  }

  const total = Math.min(names.length, pos.length ?? names.length)
  let matched = 0
  let missing = 0

  for (let i = 0; i < total; i++) {
    const rawName = names[i]
    const v = pos[i]

    if (!rawName || !Number.isFinite(v)) continue

    const name = typeof nameTransform === 'function' ? nameTransform(rawName) : rawName
    const joint = robot.joints[name]

    if (joint) {
      joint.setJointValue(v) // rad
      matched++
    } else {
      missing++
    }
  }

  return emit({ matched, missing, total })
}
