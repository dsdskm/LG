import { useEffect, useMemo, useState } from 'react'
import { EMERGENCY_TOPICS } from '@/constants/topics'
import { isEmergencyKeyLocked, resolveEmergencyKeyState } from '@/utils/emergencyKey'

/**
 * useEmergencyKey
 *
 * useTelemetry 가 받아 둔 /emergency_key_status 를 비상정지 버튼 상태로 접어 준다
 * (맵 스캔 화면과 시맨틱 화면이 같은 판정을 쓰기 위한 공용 훅).
 *
 * 구독은 useTelemetry 가 advertise 를 보고 자동으로 한다(EMERGENCY_TOPICS) — 이 훅은 판정만 한다.
 *
 * 발행이 끊긴 것을 알아채려면 값이 아니라 시간이 흘러야 하므로 1초마다 기준 시각을 갱신한다.
 * 렌더에만 의존하면 안 된다: 연결이 끊기면 customTopicsData 갱신도 멈춰서, 마지막 값이
 * locked 인 채로 화면에 그대로 남는다.
 *
 * @param {string[]} subscribedTopics useTelemetry.subscribedTopics
 * @param {Record<string, object>} customTopicsData useTelemetry.customTopicsData
 * @param {Record<string, number>} customTopicsUpdatedAt useTelemetry.customTopicsUpdatedAt
 * @returns {{state: string, value: number|null, stale: boolean, topic: string|null, isLocked: boolean}}
 */
export function useEmergencyKey(subscribedTopics = [], customTopicsData = {}, customTopicsUpdatedAt = {}) {
  const topic = EMERGENCY_TOPICS.find((candidate) => subscribedTopics.includes(candidate)) ?? null
  const message = topic ? customTopicsData[topic] : null
  const updatedAt = topic ? customTopicsUpdatedAt[topic] : null

  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const timerId = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(timerId)
  }, [])

  return useMemo(() => {
    const resolved = resolveEmergencyKeyState({ message, updatedAt, now })
    return { ...resolved, topic, isLocked: isEmergencyKeyLocked(resolved.state) }
  }, [message, updatedAt, now, topic])
}
