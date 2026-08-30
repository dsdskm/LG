/**
 * 최소 기능의 TF 트리 유틸.
 *
 * 로봇의 현재 위치는 `map -> base_link` 변환이다.
 * lio-fr-system 은 이를 두 단계로 나누어 발행하므로 합성이 필요하다.
 *
 *   map --(map->lio_odom: 루프 클로저/리로컬라이제이션 보정량)--> lio_odom
 *       --(lio_odom->base_link: 누적 오도메트리)--> base_link
 *
 * `/lio/odom` 토픽은 뒷단(lio_odom 기준)만 담고 있어서, localization 모드처럼
 * 보정량이 0이 아닐 때 지도와 어긋난다. 그래서 TF 를 합성해 map 기준 pose 를 구한다.
 */

/** 지도(전역) 프레임. */
export const MAP_FRAME = 'map'

/** 오도메트리 프레임 후보 — map 프레임이 없는 lio_only 모드의 폴백 기준이다. */
export const ODOM_FRAMES = ['lio_odom', 'odom']

/** 로봇 본체 프레임 후보. */
export const BASE_FRAMES = ['base_link', 'base_footprint']

/** 체인이 비정상적으로 길면(루프 등) 탐색을 중단한다. */
const MAX_CHAIN_DEPTH = 32

/**
 * TFMessage 들을 프레임 트리에 병합한다.
 * child_frame_id 를 키로 두므로 같은 프레임의 갱신은 자연히 최신값으로 덮인다.
 *
 * @param {Record<string, {parent: string, t: {x,y,z}, q: {x,y,z,w}}>} tree 기존 트리 (변경되지 않음)
 * @param {{transforms?: Array}} tfMessage /tf 또는 /tf_static 파싱 결과
 * @returns {object} 병합된 새 트리. 변경이 없으면 기존 트리를 그대로 반환한다.
 */
export function mergeTransforms(tree, tfMessage) {
  const transforms = tfMessage?.transforms
  if (!Array.isArray(transforms) || transforms.length === 0) return tree

  const next = { ...tree }
  transforms.forEach((tf) => {
    const child = tf?.child_frame_id
    const parent = tf?.header?.frame_id
    const t = tf?.transform?.translation
    const q = tf?.transform?.rotation
    if (!child || !parent || !t || !q) return
    next[child] = { parent, t: { x: t.x, y: t.y, z: t.z }, q: { x: q.x, y: q.y, z: q.z, w: q.w } }
  })
  return next
}

/** 쿼터니언 곱 (a 적용 후 b 적용). */
function quatMul(a, b) {
  return {
    x: a.w * b.x + a.x * b.w + a.y * b.z - a.z * b.y,
    y: a.w * b.y - a.x * b.z + a.y * b.w + a.z * b.x,
    z: a.w * b.z + a.x * b.y - a.y * b.x + a.z * b.w,
    w: a.w * b.w - a.x * b.x - a.y * b.y - a.z * b.z
  }
}

/** 벡터를 쿼터니언으로 회전. */
function quatRotate(q, v) {
  // v' = v + 2 * cross(q.xyz, cross(q.xyz, v) + q.w * v)
  const tx = 2 * (q.y * v.z - q.z * v.y)
  const ty = 2 * (q.z * v.x - q.x * v.z)
  const tz = 2 * (q.x * v.y - q.y * v.x)
  return {
    x: v.x + q.w * tx + (q.y * tz - q.z * ty),
    y: v.y + q.w * ty + (q.z * tx - q.x * tz),
    z: v.z + q.w * tz + (q.x * ty - q.y * tx)
  }
}

/** 변환 합성: parent->mid (a) 와 mid->child (b) 를 parent->child 로 잇는다. */
function composeTransform(a, b) {
  const rotated = quatRotate(a.q, b.t)
  return {
    t: { x: a.t.x + rotated.x, y: a.t.y + rotated.y, z: a.t.z + rotated.z },
    q: quatMul(a.q, b.q)
  }
}

/**
 * target -> source 변환을 조회한다. 트리에서 source 부터 부모를 따라 올라가
 * target 을 만나면 그 체인을 합성한다. 경로가 없으면 null.
 *
 * ROS 의 tf2 와 달리 시간 보간은 하지 않는다(최신값 사용). 캔버스 표시용으로는 충분하다.
 */
export function lookupTransform(tree, targetFrame, sourceFrame) {
  if (!tree) return null
  if (targetFrame === sourceFrame) {
    return { t: { x: 0, y: 0, z: 0 }, q: { x: 0, y: 0, z: 0, w: 1 } }
  }

  // source 에서 target 까지 올라가며 체인 수집 (각 원소는 parent->child 변환)
  const chain = []
  let frame = sourceFrame
  for (let depth = 0; depth < MAX_CHAIN_DEPTH; depth++) {
    const link = tree[frame]
    if (!link) return null
    chain.push(link)
    if (link.parent === targetFrame) {
      // target->...->source 순서로 합성
      let acc = chain[chain.length - 1]
      for (let i = chain.length - 2; i >= 0; i--) {
        acc = composeTransform(acc, chain[i])
      }
      return { t: acc.t, q: acc.q }
    }
    frame = link.parent
  }
  return null
}

/**
 * 점(m)을 변환한다 — tf 는 lookupTransform 이 준 target->source 변환이고,
 * point 는 source 프레임 기준 좌표다. 결과는 target 프레임 좌표.
 * tf 가 없으면 좌표를 그대로 돌려주므로 호출 측에서 분기하지 않아도 된다.
 *
 * @param {{t: {x,y,z}, q: {x,y,z,w}}|null} tf
 * @param {{x: number, y: number, z?: number}} point
 */
export function transformPoint(tf, point) {
  if (!tf) return point
  const rotated = quatRotate(tf.q, { x: point.x, y: point.y, z: point.z ?? 0 })
  return { x: tf.t.x + rotated.x, y: tf.t.y + rotated.y, z: tf.t.z + rotated.z }
}

/**
 * 오도메트리 프레임 → map 보정량(map->lio_odom 등)을 미리 모아둔다.
 *
 * lio_node 는 매핑 중 궤적/경로 토픽을 lio_odom 기준으로 발행한다
 * (lio_node.cpp: frame = (TC || localization) ? "map" : "lio_odom").
 * 루프 클로저로 map->lio_odom 보정이 0이 아니게 되면 그 값을 지도에 그대로 찍을 수 없으므로,
 * 소비 측이 프레임 이름으로 보정량을 찾아 transformPoint 할 수 있게 한다.
 *
 * @returns {Record<string, {t: object, q: object}>} 존재하는 오도메트리 프레임만 담긴 맵
 */
export function resolveFrameCorrections(tree) {
  if (!tree) return {}
  const corrections = {}
  for (const odomFrame of ODOM_FRAMES) {
    const tf = lookupTransform(tree, MAP_FRAME, odomFrame)
    if (tf) corrections[odomFrame] = tf
  }
  return corrections
}

/** 쿼터니언에서 2D heading(yaw, rad). base_link X축을 XY 평면에 투영한 각도. */
export function yawOf(q) {
  return Math.atan2(2 * (q.w * q.z + q.x * q.y), 1 - 2 * (q.y * q.y + q.z * q.z))
}

/**
 * 지도 기준 로봇 pose 를 구한다.
 *
 * 1순위: map -> base_link (매핑/localization 모드 공통, 보정량 반영됨)
 * 2순위: lio_odom -> base_link (map 프레임이 없는 lio_only 모드. 이때 odom 이 사실상 map)
 *
 * @returns {{x: number, y: number, yaw: number, frame: string} | null}
 */
export function resolveRobotPose(tree) {
  if (!tree) return null

  for (const reference of [MAP_FRAME, ...ODOM_FRAMES]) {
    for (const base of BASE_FRAMES) {
      const tf = lookupTransform(tree, reference, base)
      if (tf) return { x: tf.t.x, y: tf.t.y, yaw: yawOf(tf.q), frame: reference }
    }
  }
  return null
}
