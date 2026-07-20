import { useEffect, useRef, useState, useCallback } from 'react'

/**
 * useFoxglove
 *
 * Web Worker를 백그라운드에서 구동하여 WebSocket 연결 관리,
 * 구독 제어 및 CDR 바이너리 파싱을 백그라운드로 오프로드하고,
 * 메인 스레드에서는 지정한 throttleFps 주기에 맞춰 상태를 동기화하여
 * 렌더링 부하와 메모리 부족(OOM) 현상을 방지하는 React 훅.
 */
export function useFoxglove(wsUrl, throttleFps = 10) {
  const [status, setStatus] = useState('disconnected')
  const [mapData, setMapData] = useState(null)
  const [odomData, setOdomData] = useState(null)
  const [scanData, setScanData] = useState(null)
  const [topics, setTopics] = useState([])
  const [subscribedTopics, setSubscribedTopics] = useState([])
  const [customTopicsData, setCustomTopicsData] = useState({})

  const workerRef = useRef(null)
  const subMapRef = useRef({})
  const nextSubIdRef = useRef(1)
  const channelsRef = useRef([])
  const subscribedTopicsRef = useRef([])

  const mapDataRef = useRef(null)
  const odomDataRef = useRef(null)
  const scanDataRef = useRef(null)
  const customTopicsDataRef = useRef({})
  const hasNewDataRef = useRef(false)

  useEffect(() => {
    subscribedTopicsRef.current = subscribedTopics
  }, [subscribedTopics])

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
        hasNewDataRef.current = false
      }
    }

    const timerId = setInterval(syncState, interval)
    return () => clearInterval(timerId)
  }, [status, throttleFps])

  // Web Worker 초기설정 및 수신 데이터 핸들러
  useEffect(() => {
    // Vite 환경에서의 Web Worker 생성 방식
    workerRef.current = new Worker(new URL('./foxglove.worker.js', import.meta.url), {
      type: 'module'
    })

    workerRef.current.onmessage = (event) => {
      const { op, status: wsStatus, channels, topic, parsed, name, supportedEncodings } = event.data

      switch (op) {
        case 'status':
          setStatus(wsStatus)
          break

        case 'serverInfo':
          console.log('서버:', name, '/ 지원 인코딩:', supportedEncodings)
          break

        case 'advertise':
          channelsRef.current = channels
          const allTopicsList = channels.map((ch) => ch.topic)
          setTopics(allTopicsList)

          const defaultSubscribes = ['/map', '/odom', '/lidar_points']
          const newSubscribes = []
          channels.forEach((ch) => {
            if (!defaultSubscribes.includes(ch.topic)) return

            // 중복 구독 방지
            const alreadySubscribed = Object.values(subMapRef.current).some((sub) => sub.topic === ch.topic)
            if (alreadySubscribed) return

            const subId = nextSubIdRef.current++
            const isCore = ['/map', '/odom', '/lidar_points', '/scan_matched_points2'].includes(ch.topic)
            const encoding = isCore ? 'cdr' : 'json'

            subMapRef.current[subId] = { topic: ch.topic, schemaName: ch.schemaName, encoding }
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

        case 'message':
          if (parsed) {
            hasNewDataRef.current = true
            switch (topic) {
              case '/map':
                mapDataRef.current = parsed
                break
              case '/odom':
                odomDataRef.current = parsed
                break
              case '/lidar_points':
                scanDataRef.current = parsed
                break
              default:
                customTopicsDataRef.current = {
                  ...customTopicsDataRef.current,
                  [topic]: parsed
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
  }, [])

  const connect = useCallback(() => {
    setStatus('connecting')
    setMapData(null)
    setOdomData(null)
    setScanData(null)
    setTopics([])
    setSubscribedTopics([])
    setCustomTopicsData({})
    subMapRef.current = {}
    nextSubIdRef.current = 1
    channelsRef.current = []

    mapDataRef.current = null
    odomDataRef.current = null
    scanDataRef.current = null
    customTopicsDataRef.current = {}
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
    setCustomTopicsData({})
    mapDataRef.current = null
    odomDataRef.current = null
    scanDataRef.current = null
    customTopicsDataRef.current = {}
    hasNewDataRef.current = false
  }, [])

  const toggleSubscribe = useCallback((topicName) => {
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

        if (topicName === '/map') {
          setMapData(null)
          mapDataRef.current = null
        } else if (topicName === '/odom') {
          setOdomData(null)
          odomDataRef.current = null
        } else if (topicName === '/lidar_points') {
          setScanData(null)
          scanDataRef.current = null
        } else {
          delete customTopicsDataRef.current[topicName]
          setCustomTopicsData({ ...customTopicsDataRef.current })
        }
      }
    } else {
      // 구독 신청
      const ch = channelsRef.current.find((c) => c.topic === topicName)
      if (!ch) return

      const subId = nextSubIdRef.current++
      const isCore = ['/map', '/odom', '/lidar_points', '/scan_matched_points2'].includes(topicName)
      const encoding = isCore ? 'cdr' : 'json'

      subMapRef.current[subId] = { topic: topicName, schemaName: ch.schemaName, encoding }

      workerRef.current.postMessage({
        op: 'subscribe',
        data: {
          subscriptions: [
            { id: subId, channelId: ch.id, topic: topicName, schemaName: ch.schemaName, encoding }
          ]
        }
      })

      setSubscribedTopics((prev) => [...prev, topicName])
    }
  }, [])

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
      const isCore = ['/map', '/odom', '/lidar_points', '/scan_matched_points2'].includes(topicName)
      const encoding = isCore ? 'cdr' : 'json'

      subMapRef.current[subId] = { topic: topicName, schemaName: ch.schemaName, encoding }
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

  const unsubscribeTopics = useCallback((topicNames) => {
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
          const topicName = sub.topic
          if (topicName === '/map') {
            setMapData(null)
            mapDataRef.current = null
          } else if (topicName === '/odom') {
            setOdomData(null)
            odomDataRef.current = null
          } else if (topicName === '/lidar_points') {
            setScanData(null)
            scanDataRef.current = null
          } else {
            delete customTopicsDataRef.current[topicName]
            setCustomTopicsData({ ...customTopicsDataRef.current })
          }
        }
        delete subMapRef.current[id]
      })

      setSubscribedTopics((prev) => prev.filter((t) => !topicNames.includes(t)))
    }
  }, [])

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
    topics,
    subscribedTopics,
    customTopicsData,
    toggleSubscribe,
    subscribeTopics,
    unsubscribeTopics,
    subscribeAll,
    unsubscribeAll,
    connect,
    disconnect
  }
}
