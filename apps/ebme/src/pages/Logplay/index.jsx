import React, { useState, useEffect, useRef, useCallback } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useLogPlayLogic } from './useLogPlayLogic'
import RosbridgeTransport from '../../core/transport/RosbridgeTransport'
import { MsgBufferManager } from '../../core/transport/msgBufferManager'
import RosLogComponent from './log/RosLogComponent'
import MapViewPanel from './components/MapViewPanel'
import { SUB_STATUS, useMapStore } from './components/useMapStore'
import { PlaybackProvider } from './PlaybackContext'
import { getMcapMsg } from '@/core/mcap/mcapLoader'
import { getStartMsgId } from '@/core/mcap/mcapLoader'

export default function Logplay({ initialDate }) {
  const [searchParams] = useSearchParams()
  const robotName = searchParams.get('robotName') || ''

  const { topRatio, containerRef, onDragStart } = useLogPlayLogic({ initialDate })

  const [pixelPos, setPixelPos] = useState([{ x: 0, y: 0 }])
  const robot1 = useRef(null)
  var msgList = useRef({})

  // ✅ (Logviewer 연결 입력/상태)
  const [urlInput, setUrlInput] = useState(
    () => localStorage.getItem('logviewer:rosbridgeUrl') || 'ws://192.168.0.13:9090'
  )
  const [topicInput, setTopicInput] = useState(() => localStorage.getItem('logviewer:topicName') || '/chatter')
  const [typeInput, setTypeInput] = useState(() => localStorage.getItem('logviewer:messageType') || 'std_msgs/String')

  // ✅ 현재 연결된 설정(표시/렌더용)
  const [activeConn, setActiveConn] = useState(null) // { url, topic, type }
  const [logConnected, setLogConnected] = useState(false)

  const TEST_MODE = true
  var robotId = 'robot1'

  // 입력값 저장
  useEffect(() => {
    localStorage.setItem('logviewer:rosbridgeUrl', urlInput)
  }, [urlInput])
  useEffect(() => {
    localStorage.setItem('logviewer:topicName', topicInput)
  }, [topicInput])
  useEffect(() => {
    localStorage.setItem('logviewer:messageType', typeInput)
  }, [typeInput])

  const normalizeUrl = (u) => String(u || '').trim()
  const normalizeTopic = (t) => {
    const s = String(t || '').trim()
    if (!s) return ''
    return s.startsWith('/') ? s : `/${s}`
  }

  //TEMP
  useEffect(() => {
    onConnectLog()
  }, [])

  const onConnectLog = useCallback(() => {
    const url = normalizeUrl(urlInput)
    const topic = normalizeTopic(topicInput)
    const type = String(typeInput || '').trim()

    if (!url) return alert('rosbridge URL을 입력하세요. 예) ws://192.168.0.13:9090')
    if (!/^wss?:\/\//i.test(url)) return alert('URL은 ws:// 또는 wss:// 로 시작해야 합니다.')
    if (!topic) return alert('토픽명을 입력하세요. 예) /chatter')
    if (!type) return alert('messageType을 입력하세요. 예) std_msgs/String')

    // ✅ 연결 설정 저장 + 컴포넌트 렌더 ON
    setActiveConn({ url, topic, type })
    setLogConnected(true)
  }, [urlInput, topicInput, typeInput])

  const onDisconnectLog = useCallback(() => {
    // ✅ 컴포넌트 언마운트로 WS 정리
    setLogConnected(false)
    setActiveConn(null)
  }, [])

  const onHeaderKeyDown = useCallback(
    (e) => {
      if (e.key === 'Enter') onConnectLog()
    },
    [onConnectLog]
  )

  // ====== 기존 map/pose/lidar 로직 ======

  const processMessage = useMapStore((state) => state.processMessages)
  const subscribeMessages = useMapStore((state) => state.subscribeMessages)
  const unsubscribeMessages = useMapStore((state) => state.unsubscribeMessages)
  const updateStatus = useMapStore((state) => state.updateStatus)
  const removeSubscribe = useMapStore((state) => state.removeSubscribe)
  const addAvailableMsgs = useMapStore((state) => state.addAvailableMsgs)

  const ONE_SECOND_NS = 1_000_000_000n

  const msgHandler = useCallback((msgs) => {
    //console.log('received msg ', msgs)
  }, [])

  useEffect(() => {
    if (TEST_MODE) {
      fetch('/ebme/mock/occupancygrid.json')
        .then((mapJson) => mapJson.json())
        .then((mapMsg) => {
          msgList.current['/carto_service/occupancygrid'] = mapMsg
        })

      fetch('/ebme/mock/lidar.json')
        .then((lidarJson) => {
          return lidarJson.json()
        })
        .then((lidarMsg) => {
          msgList.current['/scan'] = lidarMsg
        })

      fetch('/ebme/mock/total_tf.json')
        .then((totalTfJson) => {
          return totalTfJson.json()
        })
        .then((totoalTfMsg) => {
          msgList.current['/tf'] = totoalTfMsg
        })

      fetch('/ebme/mock/path.json')
        .then((pathJson) => {
          return pathJson.json()
        })
        .then((pathMsg) => {
          msgList.current['/path'] = pathMsg
        })

      fetch('/ebme/mock/posedStamped.json')
        .then((json) => {
          return json.json()
        })
        .then((msg) => {
          msgList.current['/carto_service/trackedpose'] = msg
        })

      fetch('/ebme/mock/rosout.json')
        .then((json) => {
          return json.json()
        })
        .then((msg) => {
          msgList.current['/rosout'] = msg
        })

      addAvailableMsgs([
        {
          msgName: '/lidar_service/data',
          msgType: 'sensor_msgs/msg/LaserScan'
        },
        { msgName: '/scan', msgType: 'sensor_msgs/msg/LaserScan' },
        {
          msgName: '/carto_service/trackedpose',
          msgType: 'geometry_msgs/Pose2dStamped'
        },
        {
          msgName: '/path',
          msgType: 'nav_msgs/msg/Path'
        }
      ])
    }

    const nameSpace = TEST_MODE ? '' : '/' + robotId

    const bufferManager = new MsgBufferManager(nameSpace)
    robot1.current = new RosbridgeTransport('ws://192.168.0.18:9090', bufferManager)

    robot1.current
      .getActiveTopics()
      .then((result) => {
        console.log('active topics', result)
        const allTopics = result.topics
        const allTypes = result.types
        const availableTopics = allTopics
          .map((name, index) => ({
            msgName: name,
            msgType: allTypes[index]
          }))
          .filter((item) => item.msgName.startsWith(nameSpace))
        addAvailableMsgs(availableTopics)
      })
      .catch((error) => {
        console.warn('get available topics fail', error)
      })

    const unsub = useMapStore.subscribe(
      (state) => state.subscribeInfo,
      (newInfo) => {
        for (let key in newInfo) {
          const subInfo = newInfo[key]
          if (subInfo.status == SUB_STATUS.REQUESTING) {
            if (newInfo[key].count >= 1) {
              //subscribe
              robot1.current.subscribeMsg(subInfo.msgName, subInfo.msgType, msgHandler)
              updateStatus(subInfo.msgName, SUB_STATUS.SUBSCRIBED)
              //console.log('[Logplay]subscribed ', subInfo.msgName)
            } else {
              //unsbuscribe
              robot1.current.unSubscribeMsg(subInfo.msgName, msgHandler)
              removeSubscribe(subInfo.msgName)
            }
          }
        }
      }
    )

    var receivedMsgId = 0

    subscribeMessages({ msgName: nameSpace + '/carto_service/occupancygrid', msgType: 'nav_msgs/msg/OccupancyGrid' })
    subscribeMessages({ msgName: '/tf', msgType: 'tf2_msgs/TFMessage' })
    subscribeMessages({ msgName: '/tf_static', msgType: 'tf2_msgs/TFMessage' })
    subscribeMessages({ msgName: '/rosout', msgType: 'rcl_interfaces/msg/Log' })

    // 1.실시간 재생
    // - msg id기준으로 현재 시점까지의 정보를 읽음
    // - 읽어 온 데이터 기준 msg id값 업데이트 .. 다음번 읽는 동작 실행시 기준점으로 사용됨
    // 2.일시정지
    // - 내부적으로 읽는 동작은 계속 진행되지만 화면 갱신은 하지 않음
    // - rosout의 경우 maxbuffer값 도달시 추가로 데이터를 받지 않고 해당 시점 기준으로 화면 갱신
    // 3.resume
    // - 화면 갱신만 재실행

    // 4. 특정 시점 부터 재생
    // - tf_static, map등 자주 발행 안되는 메시지 가져 와야함, path등도 발행 주기 확인 필요
    // - 이후 기존 재생 로직과 동일하게 특정 시간 주기로 정보 가져옴
    // - ex) bufferManager.getLatestMsg(key, receivedTime)로 모든 관심 메시지 특정 시간대 최신정보로 수신
    //       tf_static의 경우 전체 메시지 가져 와야 할듯... 이후 기존 로직 처럼 처리

    const readTimerId = setInterval(() => {
      if (TEST_MODE) {
        Object.entries(msgList.current).forEach(([key, value]) => {
          //console.log(`${key}:`, value)

          if (key === '/carto_service/trackedpose') {
            var index = Math.floor(Math.random() * 10) % 5
            switch (index) {
              case 0: // X축 이동
              case 1: // X축 이동
                value.pose.x += 0.1
                break
              case 2: // Y축 이동
              case 3: // Y축 이동
                value.pose.y += 0.1
                break
              case 4: // 정지 (case 3 대신 2를 사용)
                value.pose.x = 0
                value.pose.y = 0
                break
            }
            //console.log('pose data = ', value.pose.position)
          } else if (key === '/scan') {
            value.ranges[0] = Math.floor(Math.random() * 10)
          } else if (key === '/rosout') {
            value.line++
          }

          bufferManager.add(key, value)
        })
      }

      const currentSubscribeInfo = useMapStore.getState().subscribeInfo
      const keys = Object.keys(currentSubscribeInfo)
      //console.log('keys = ', keys)
      const msgs = bufferManager.getMsg(keys, receivedMsgId)
      if (!msgs || msgs.length < 1) {
        return
      }

      //console.log('msgs length = ', msgs.length)
      receivedMsgId = msgs.at(-1).msgId

      processMessage(msgs)

      // if (receivedMsgId === 0) {
      //   getStartMsgId('/ebme/mock/dwa_mcap_20260305.mcap').then((id) => {
      //     receivedMsgId = id
      //   })
      // } else {
      //   getMcapMsg('/ebme/mock/dwa_mcap_20260305.mcap', keys, receivedMsgId, receivedMsgId + ONE_SECOND_NS).then(
      //     (msgs) => {
      //       if (!msgs || msgs.length < 1) {
      //         return
      //       }
      //       console.log('msgs length = ', msgs.length)
      //       //console.log('msgs  = ', msgs)
      //       receivedMsgId = msgs.at(-1).msgId
      //       processMessage(msgs)
      //     }
      //   )
      // }
    }, 500)

    return () => {
      // 구독 해제/연결 종료

      unsubscribeMessages({
        msgName: nameSpace + '/carto_service/occupancygrid',
        msgType: 'nav_msgs/msg/OccupancyGrid'
      })
      unsubscribeMessages({ msgName: '/tf', msgType: 'tf2_msgs/TFMessage' })
      unsubscribeMessages({ msgName: '/tf_static', msgType: 'tf2_msgs/TFMessage' })
      unsubscribeMessages({ msgName: '/rosout', msgType: 'rcl_interfaces/msg/Log' })
      unsub()
      robot1.current?.close()
      robot1.current = null
      bufferManager.clearData()
      clearInterval(readTimerId)
    }
  }, [])

  return (
    <PlaybackProvider>
      <div ref={containerRef} style={S.page}>
        {/* ✅ 최상단 헤더: URL/Topic/Type 입력 + 버튼 + 로봇명(우측 끝) */}
        <div style={S.pageHeader}>
          <span style={S.robotName}>{robotName}</span>
        </div>

        <div style={S.content}>
          {/* 상단(맵/센서) */}
          <div style={{ ...S.topPane, height: `calc(${topRatio}% - 4px)` }}>
            <div style={S.mapsArea}>
              <div style={S.mapCard}>
                <div style={S.mapHeader}>
                  <span>실시간 맵</span>
                </div>
                <div style={S.mapBody}>
                  <MapViewPanel root={TEST_MODE ? 'map' : robotId + '/' + 'map'} />
                </div>
              </div>

              <div style={S.mapCard}>
                <div style={S.mapHeader}>
                  <span>센서 정보</span>
                </div>
                <div style={S.mapBody}>
                  <MapViewPanel root={TEST_MODE ? 'map' : robotId + '/' + 'map'} />
                </div>
              </div>
            </div>
          </div>

          {/* 드래그 바 */}
          <div style={S.dragBar} onMouseDown={onDragStart} title="위/아래 영역 높이를 드래그로 조절" />

          {/* 하단(로그) */}
          <div style={{ ...S.bottomPane, height: `calc(${100 - topRatio}% - 4px)` }}>
            <div style={S.bottomInner}>
              <RosLogComponent />
            </div>
          </div>
        </div>
      </div>
    </PlaybackProvider>
  )
}

/* ======================
   스타일 (inline objects)
   ====================== */
const S = {
  page: {
    boxSizing: 'border-box',
    display: 'flex',
    flexDirection: 'column',
    width: '100%',
    height: '100vh',
    background: '#fafafa'
  },

  // 최상단 헤더
  pageHeader: {
    height: 44,
    minHeight: 44,
    display: 'flex',
    alignItems: 'center',
    padding: '0 12px',
    background: '#FFFFFF',
    borderBottom: '1px solid #E5E7EB',
    gap: 12
  },
  pageHeaderLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    minWidth: 0,
    flex: 1,
    overflow: 'hidden'
  },
  pageHeaderRight: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'flex-end'
  },
  robotName: {
    color: '#111827',
    fontWeight: 700,
    fontSize: 13,
    padding: '6px 10px',
    borderRadius: 999,
    border: '1px solid #E5E7EB',
    background: '#F9FAFB',
    whiteSpace: 'nowrap'
  },

  headerInputWide: {
    width: 260,
    padding: '6px 10px',
    borderRadius: 8,
    border: '1px solid #E5E7EB',
    outline: 'none'
  },
  headerInput: {
    width: 140,
    padding: '6px 10px',
    borderRadius: 8,
    border: '1px solid #E5E7EB',
    outline: 'none'
  },
  headerInputType: {
    width: 180,
    padding: '6px 10px',
    borderRadius: 8,
    border: '1px solid #E5E7EB',
    outline: 'none'
  },
  headerBtn: {
    padding: '6px 10px',
    borderRadius: 8,
    border: '1px solid #E5E7EB',
    background: '#fff',
    cursor: 'pointer',
    whiteSpace: 'nowrap'
  },
  activeConn: {
    marginLeft: 8,
    fontSize: 12,
    color: '#6B7280',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis'
  },
  activeConnMuted: {
    marginLeft: 8,
    fontSize: 12,
    color: '#9CA3AF',
    whiteSpace: 'nowrap'
  },

  content: {
    position: 'relative',
    boxSizing: 'border-box',
    display: 'flex',
    flexDirection: 'column',
    flex: 1,
    minHeight: 0,
    padding: '12px',
    gap: '8px'
  },
  topPane: { position: 'relative', minHeight: 200 },

  // ✅ 하단 영역은 “가변 높이”여도 내부 height 체인이 깨지지 않게 flex + minHeight:0 필수
  bottomPane: {
    position: 'relative',
    minHeight: 120,
    display: 'flex',
    flexDirection: 'column',
    minWidth: 0
  },
  bottomInner: {
    flex: 1,
    minHeight: 0,
    overflow: 'hidden',
    background: '#FFFFFF',
    border: '1px solid #E5E7EB',
    borderRadius: 12
  },
  logPlaceholder: {
    height: '100%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: '#6B7280',
    fontSize: 13
  },

  dragBar: {
    height: 6,
    background: '#E5E7EB',
    borderRadius: 3,
    cursor: 'row-resize',
    boxShadow: 'inset 0 0 0 1px #d1d5db'
  },

  mapsArea: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: 12,
    width: '100%',
    height: '100%',
    minHeight: 0
  },
  mapCard: {
    display: 'flex',
    flexDirection: 'column',
    border: '1px solid #E5E7EB',
    borderRadius: 12,
    overflow: 'hidden',
    background: '#FFFFFF',
    minHeight: 0
  },
  mapHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '8px 12px',
    borderBottom: '1px solid #F3F4F6',
    background: '#F9FAFB',
    fontSize: 14,
    fontWeight: 600
  },
  mapBody: {
    position: 'relative',
    flex: 1,
    minHeight: 0,
    background: '#F3F4F6',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden'
  },
  mapImage: { width: '100%', height: '100%', objectFit: 'cover', userSelect: 'none' }
}

