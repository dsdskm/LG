import { useEffect, useRef, useState, useCallback } from 'react'
import {
  EMERGENCY_TOPICS,
  FOOTPRINT_TOPICS,
  MAP_TOPICS,
  NAV_STATUS_TOPICS,
  ODOM_TOPICS,
  SCAN_TOPICS,
  SPIN_STATUS_TOPICS,
  STATUS_TOPICS,
  TF_TOPICS,
  TRAJECTORY_TOPICS,
  encodingFor,
  resolveTopic,
  topicCategory
} from '@/constants/topics'
import { mergeTransforms, resolveFrameCorrections, resolveRobotPose } from '@/utils/tf'

/**
 * useTelemetry
 *
 * 붙는 대상은 init-setup-be 의 텔레메트리 릴레이다(utils/wsUrl.js → /telemetry).
 * 전송 경로는 zenoh-bridge-ros2dds → (SSE) init-setup-be → (WebSocket) 이 훅 이며,
 * 릴레이가 foxglove 프로토콜의 최소 부분집합(advertise/subscribe/message)을 말하므로
 * 워커/파서/이 훅의 구조는 그 규약을 그대로 따른다.
 *
 * Web Worker를 백그라운드에서 구동하여 WebSocket 연결 관리,
 * 구독 제어 및 CDR 바이너리 파싱을 백그라운드로 오프로드하고,
 * 메인 스레드에서는 지정한 throttleFps 주기에 맞춰 상태를 동기화하여
 * 렌더링 부하와 메모리 부족(OOM) 현상을 방지하는 React 훅.
 *
 * 토픽 이름을 직접 비교하지 않고 @/constants/topics의 역할(category)로 판단하므로,
 * LIO(/lio/grid_map, /lio/odom)와 Cartographer(/map, /odom) 양쪽에서 동작한다.
 */
export function useTelemetry(wsUrl, throttleFps = 10) {
  const [status, setStatus] = useState('disconnected')
  const [mapData, setMapData] = useState(null)
  const [odomData, setOdomData] = useState(null)
  const [scanData, setScanData] = useState(null)
  const [robotPose, setRobotPose] = useState(null)
  // 오도메트리 프레임 기준으로 발행되는 토픽(매핑 중 /lio/path 등)을 지도에 겹칠 때 쓰는 보정량.
  const [frameCorrections, setFrameCorrections] = useState({})
  const [topics, setTopics] = useState([])
  const [subscribedTopics, setSubscribedTopics] = useState([])
  const [customTopicsData, setCustomTopicsData] = useState({})
  // 토픽별 마지막 수신 시각(ms). 하트비트로 같은 값을 반복 발행하는 토픽은 값만으로는 "지금도
  // 살아 있는지" 를 알 수 없어서(정지한 발행자의 마지막 값이 그대로 남는다) 함께 내보낸다.
  const [customTopicsUpdatedAt, setCustomTopicsUpdatedAt] = useState({})

  const workerRef = useRef(null)
  const subMapRef = useRef({})
  const nextSubIdRef = useRef(1)
  const channelsRef = useRef([])
  const subscribedTopicsRef = useRef([])

  const mapDataRef = useRef(null)
  const odomDataRef = useRef(null)
  const scanDataRef = useRef(null)
  const customTopicsDataRef = useRef({})
  const customTopicsUpdatedAtRef = useRef({})
  const tfTreeRef = useRef({})
  const hasNewDataRef = useRef(false)

  useEffect(() => {
    subscribedTopicsRef.current = subscribedTopics
  }, [subscribedTopics])

  // 구독 해제된 토픽의 잔여 데이터 정리 (역할별 state / customTopicsData)
  const clearTopicData = useCallback((topicName) => {
    switch (topicCategory(topicName)) {
      case 'map':
        setMapData(null)
        mapDataRef.current = null
        break
      case 'odom':
        setOdomData(null)
        odomDataRef.current = null
        break
      case 'scan':
        setScanData(null)
        scanDataRef.current = null
        break
      case 'tf':
        // /tf 와 /tf_static 은 같은 트리를 채우므로, 한쪽만 끊겨도 트리를 비우고 다시 모은다.
        tfTreeRef.current = {}
        setRobotPose(null)
        setFrameCorrections({})
        break
      default:
        delete customTopicsDataRef.current[topicName]
        delete customTopicsUpdatedAtRef.current[topicName]
        setCustomTopicsData({ ...customTopicsDataRef.current })
        setCustomTopicsUpdatedAt({ ...customTopicsUpdatedAtRef.current })
        break
    }
  }, [])

  // 주기적으로 React 상태 동기화 (프레임 레이트 조절)
  useEffect(() => {
    if (status !== 'connected') return

    const interval = Math.max(16, Math.round(1000 / throttleFps))

    const syncState = () => {
      if (hasNewDataRef.current) {
        setMapData(mapDataRef.current)
        setOdomData(odomDataRef.current)
        setScanData(scanDataRef.current)
        setCustomTopicsData({ ...customTopicsDataRef.current })
        setCustomTopicsUpdatedAt({ ...customTopicsUpdatedAtRef.current })
        // TF 트리는 IMU rate 로 들어오므로 pose 합성도 렌더 주기에 맞춰 한 번만 한다.
        setRobotPose(resolveRobotPose(tfTreeRef.current))
        setFrameCorrections(resolveFrameCorrections(tfTreeRef.current))
        hasNewDataRef.current = false
      }
    }

    const timerId = setInterval(syncState, interval)
    return () => clearInterval(timerId)
  }, [status, throttleFps])

  // Web Worker 초기설정 및 수신 데이터 핸들러
  useEffect(() => {
    // Vite 환경에서의 Web Worker 생성 방식
    workerRef.current = new Worker(new URL('./telemetry.worker.js', import.meta.url), {
      type: 'module'
    })

    workerRef.current.onmessage = (event) => {
      const { op, status: wsStatus, channels, channelIds, topic, parsed, name, supportedEncodings } = event.data

      switch (op) {
        case 'status':
          setStatus(wsStatus)
          break

        case 'serverInfo':
          console.log('서버:', name, '/ 지원 인코딩:', supportedEncodings)
          break

        // advertise 는 "새로 생긴 채널만" 담긴 증분 메시지다. 통째로 교체하면 앞선 배치에서
        // 받은 토픽이 목록에서 사라지므로(= 토픽 목록이 계속 뒤바뀜) channelId 기준으로 병합한다.
        case 'advertise': {
          const byId = new Map(channelsRef.current.map((ch) => [ch.id, ch]))
          channels.forEach((ch) => byId.set(ch.id, ch))
          channelsRef.current = Array.from(byId.values())

          // 같은 토픽이 재기동으로 새 channelId 를 받는 경우가 있어 표시용 목록은 중복을 없앤다.
          const allTopicsList = Array.from(new Set(channelsRef.current.map((ch) => ch.topic)))
          setTopics(allTopicsList)

          // 역할별로 실제 advertise된 토픽 하나씩만 자동 구독한다.
          // (LIO와 Cartographer가 동시에 떠 있어도 중복 구독하지 않는다)
          // TF 는 후보 중 하나가 아니라 존재하는 것을 모두 구독한다 — /tf 와 /tf_static 이
          // 함께 하나의 프레임 트리를 이루고, 그 트리에서 map->base_link 를 합성한다.
          const defaultSubscribes = [
            resolveTopic(MAP_TOPICS, allTopicsList),
            resolveTopic(ODOM_TOPICS, allTopicsList),
            resolveTopic(SCAN_TOPICS, allTopicsList),
            resolveTopic(STATUS_TOPICS, allTopicsList),
            // 주행 궤적 — 매핑 중에만 발행되므로 없을 수 있다(MapCanvas 가 구독 여부로 그림 결정).
            resolveTopic(TRAJECTORY_TOPICS, allTopicsList),
            resolveTopic(NAV_STATUS_TOPICS, allTopicsList),
            resolveTopic(SPIN_STATUS_TOPICS, allTopicsList),
            // 비상정지 버튼 상태 — power-on-micom 이 없는 구성(시뮬레이터 등)에서는 안 온다.
            resolveTopic(EMERGENCY_TOPICS, allTopicsList),
            // 로봇 외형 폴리곤 — nav2 가 떠 있을 때만 존재한다(없으면 MapCanvas 가 상수 폴백).
            resolveTopic(FOOTPRINT_TOPICS, allTopicsList),
            ...TF_TOPICS.filter((topicName) => allTopicsList.includes(topicName))
          ].filter(Boolean)

          // 병합된 전체 목록을 훑는다 — 역할 토픽이 앞선 배치로 이미 와 있었더라도
          // (그때는 우선순위 판정에서 밀렸을 수 있으므로) 지금 다시 후보가 될 수 있다.
          const newSubscribes = []
          channelsRef.current.forEach((ch) => {
            if (!defaultSubscribes.includes(ch.topic)) return

            // 중복 구독 방지
            const alreadySubscribed = Object.values(subMapRef.current).some((sub) => sub.topic === ch.topic)
            if (alreadySubscribed) return

            const subId = nextSubIdRef.current++
            const encoding = encodingFor(ch.schemaName)

            subMapRef.current[subId] = { topic: ch.topic, schemaName: ch.schemaName, encoding, channelId: ch.id }
            newSubscribes.push({ id: subId, channelId: ch.id, topic: ch.topic, schemaName: ch.schemaName, encoding })
          })

          if (newSubscribes.length > 0) {
            workerRef.current.postMessage({
              op: 'subscribe',
              data: { subscriptions: newSubscribes }
            })
            setSubscribedTopics((prev) => {
              const merged = new Set([...prev, ...newSubscribes.map((s) => s.topic)])
              return Array.from(merged)
            })
          }
          break
        }

        // 채널이 사라지면(노드 종료·재시작) 그 채널만 목록에서 빼고 구독 매핑을 정리한다.
        // 정리해 두면 같은 토픽이 새 channelId 로 다시 advertise 될 때 자동 재구독된다.
        case 'unadvertise': {
          const goneIds = new Set(channelIds ?? [])
          const goneTopics = channelsRef.current.filter((ch) => goneIds.has(ch.id)).map((ch) => ch.topic)
          if (goneTopics.length === 0) break

          channelsRef.current = channelsRef.current.filter((ch) => !goneIds.has(ch.id))
          const remainingTopics = new Set(channelsRef.current.map((ch) => ch.topic))
          setTopics(Array.from(remainingTopics))

          Object.entries(subMapRef.current).forEach(([subId, sub]) => {
            if (!goneIds.has(sub.channelId)) return
            delete subMapRef.current[subId]
            // 같은 토픽이 다른 채널로 아직 살아 있으면 데이터를 지우지 않는다.
            if (!remainingTopics.has(sub.topic)) clearTopicData(sub.topic)
          })

          const droppedTopics = goneTopics.filter((topicName) => !remainingTopics.has(topicName))
          if (droppedTopics.length > 0) {
            setSubscribedTopics((prev) => prev.filter((t) => !droppedTopics.includes(t)))
          }
          break
        }

        case 'message':
          if (parsed) {
            hasNewDataRef.current = true
            switch (topicCategory(topic)) {
              case 'map':
                mapDataRef.current = parsed
                break
              case 'odom':
                odomDataRef.current = parsed
                break
              case 'scan':
                scanDataRef.current = parsed
                break
              case 'tf':
                tfTreeRef.current = mergeTransforms(tfTreeRef.current, parsed)
                break
              default:
                customTopicsDataRef.current = {
                  ...customTopicsDataRef.current,
                  [topic]: parsed
                }
                customTopicsUpdatedAtRef.current = {
                  ...customTopicsUpdatedAtRef.current,
                  [topic]: Date.now()
                }
                break
            }
          }
          break

        default:
          break
      }
    }

    return () => {
      if (workerRef.current) {
        workerRef.current.terminate()
      }
    }
    // clearTopicData 는 useCallback([]) 로 고정이라 워커가 재생성되지 않는다.
  }, [clearTopicData])

  const connect = useCallback(() => {
    setStatus('connecting')
    setMapData(null)
    setOdomData(null)
    setScanData(null)
    setRobotPose(null)
    setFrameCorrections({})
    setTopics([])
    setSubscribedTopics([])
    setCustomTopicsData({})
    setCustomTopicsUpdatedAt({})
    subMapRef.current = {}
    nextSubIdRef.current = 1
    channelsRef.current = []

    mapDataRef.current = null
    odomDataRef.current = null
    scanDataRef.current = null
    customTopicsDataRef.current = {}
    customTopicsUpdatedAtRef.current = {}
    tfTreeRef.current = {}
    hasNewDataRef.current = false

    if (workerRef.current) {
      workerRef.current.postMessage({
        op: 'connect',
        data: { url: wsUrl }
      })
    }
  }, [wsUrl])

  const disconnect = useCallback(() => {
    if (workerRef.current) {
      workerRef.current.postMessage({
        op: 'disconnect'
      })
    }
    setStatus('disconnected')
    setMapData(null)
    setOdomData(null)
    setScanData(null)
    setRobotPose(null)
    setFrameCorrections({})
    setCustomTopicsData({})
    setCustomTopicsUpdatedAt({})
    mapDataRef.current = null
    odomDataRef.current = null
    scanDataRef.current = null
    customTopicsDataRef.current = {}
    customTopicsUpdatedAtRef.current = {}
    tfTreeRef.current = {}
    hasNewDataRef.current = false
  }, [])

  const toggleSubscribe = useCallback(
    (topicName) => {
      if (!workerRef.current) return

      const isSubscribed = subscribedTopicsRef.current.includes(topicName)

      if (isSubscribed) {
        // 구독 해제
        const subEntries = Object.entries(subMapRef.current).filter(([_, sub]) => sub.topic === topicName)
        if (subEntries.length > 0) {
          const subscriptionIdsToUnsub = subEntries.map(([id]) => Number(id))
          workerRef.current.postMessage({
            op: 'unsubscribe',
            data: { subscriptionIds: subscriptionIdsToUnsub }
          })

          subscriptionIdsToUnsub.forEach((id) => {
            delete subMapRef.current[id]
          })

          setSubscribedTopics((prev) => prev.filter((t) => t !== topicName))

          clearTopicData(topicName)
        }
      } else {
        // 구독 신청
        const ch = channelsRef.current.find((c) => c.topic === topicName)
        if (!ch) return

        const subId = nextSubIdRef.current++
        const encoding = encodingFor(ch.schemaName)

        subMapRef.current[subId] = { topic: topicName, schemaName: ch.schemaName, encoding, channelId: ch.id }

        workerRef.current.postMessage({
          op: 'subscribe',
          data: {
            subscriptions: [{ id: subId, channelId: ch.id, topic: topicName, schemaName: ch.schemaName, encoding }]
          }
        })

        setSubscribedTopics((prev) => [...prev, topicName])
      }
    },
    [clearTopicData]
  )

  const subscribeTopics = useCallback((topicNames) => {
    if (!workerRef.current) return

    const newSubs = []
    const newSubscribedList = [...subscribedTopicsRef.current]

    topicNames.forEach((topicName) => {
      const isAlreadySubscribed = subscribedTopicsRef.current.includes(topicName)
      if (isAlreadySubscribed) return

      const ch = channelsRef.current.find((c) => c.topic === topicName)
      if (!ch) return

      const subId = nextSubIdRef.current++
      const encoding = encodingFor(ch.schemaName)

      subMapRef.current[subId] = { topic: topicName, schemaName: ch.schemaName, encoding, channelId: ch.id }
      newSubs.push({ id: subId, channelId: ch.id, topic: topicName, schemaName: ch.schemaName, encoding })
      newSubscribedList.push(topicName)
    })

    if (newSubs.length > 0) {
      workerRef.current.postMessage({
        op: 'subscribe',
        data: { subscriptions: newSubs }
      })
      setSubscribedTopics(newSubscribedList)
    }
  }, [])

  const unsubscribeTopics = useCallback(
    (topicNames) => {
      if (!workerRef.current) return

      const subEntries = Object.entries(subMapRef.current).filter(([_, sub]) => topicNames.includes(sub.topic))
      if (subEntries.length > 0) {
        const subscriptionIdsToUnsub = subEntries.map(([id]) => Number(id))

        workerRef.current.postMessage({
          op: 'unsubscribe',
          data: { subscriptionIds: subscriptionIdsToUnsub }
        })

        subscriptionIdsToUnsub.forEach((id) => {
          const sub = subMapRef.current[id]
          if (sub) {
            clearTopicData(sub.topic)
          }
          delete subMapRef.current[id]
        })

        setSubscribedTopics((prev) => prev.filter((t) => !topicNames.includes(t)))
      }
    },
    [clearTopicData]
  )

  const subscribeAll = useCallback(() => {
    const allTopics = channelsRef.current.map((c) => c.topic)
    subscribeTopics(allTopics)
  }, [subscribeTopics])

  const unsubscribeAll = useCallback(() => {
    const subscribedList = Object.values(subMapRef.current).map((s) => s.topic)
    unsubscribeTopics(subscribedList)
  }, [unsubscribeTopics])

  return {
    status,
    mapData,
    odomData,
    scanData,
    robotPose, // 지도(map) 기준 로봇 pose { x, y, yaw, frame } — TF 합성 결과
    frameCorrections, // { lio_odom: map->lio_odom, ... } — odom 기준 토픽을 지도에 겹칠 때 쓴다
    topics,
    subscribedTopics,
    customTopicsData,
    customTopicsUpdatedAt, // { '/토픽': ms } — 하트비트 토픽의 stale 판정용(값이 아니라 수신 시각)
    toggleSubscribe,
    subscribeTopics,
    unsubscribeTopics,
    subscribeAll,
    unsubscribeAll,
    connect,
    disconnect
  }
}
