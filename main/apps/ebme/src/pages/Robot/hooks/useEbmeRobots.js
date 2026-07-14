import { useState, useEffect, useRef, useCallback } from 'react'
import useWebSocket, { ReadyState } from 'react-use-websocket'
import apiHeader from './apiHeader'
import { createMessageID } from '@/utils/utils'

const connectionStatus = {
  [ReadyState.CONNECTING]: '연결 중...',
  [ReadyState.OPEN]: '연결됨',
  [ReadyState.CLOSING]: '연결 종료 중...',
  [ReadyState.CLOSED]: '연결 종료',
  [ReadyState.UNINSTANTIATED]: '초기화 되지 않음'
}
/**
 * EBME 로봇 목록을 관리하는 커스텀 훅
 *
 * EBME 서버에 WebSocket 연결을 통해 로봇 정보를 실시간으로 수신하고,
 * 서버로부터 받은 로봇 데이터를 관리합니다.
 *
 * @param {string} serverUrl - EBME 서버의 WebSocket URL
 *
 * @returns {Object} 로봇 데이터와 상태 관리 객체
 * @returns {Array<Object>} returns.robotList - 로봇 정보 배열
 * @returns {number} returns.readyState - WebSocket 연결 상태 (ReadyState 상수 값)
 * @returns {boolean} returns.isLoading - 데이터 로딩 상태
 * @returns {boolean} returns.isConnected - WebSocket 연결 여부
 * @returns {Object} returns.status - 로봇 상태 정보 객체
 * @returns {number} returns.status.type - 처리된 command id
 * @returns {boolean} returns.status.success - command 성공 여부
 * @returns {Function} reutrns.addRegistableRobot - ebme-agent를 통해 BE에 로봇 등록이 가능하도록, '등록 가능 목록'에 추가하는 함수 (deviceId: string, domainId: string) => void
 * @returns {Function} returns.requestAllRobots - 모든 로봇 정보를 요청하는 함수 () => void
 *
 * @example
 *   import { ReadyState } from 'react-use-websocket'
 *   const { robotList, readyState, status, isLoading, addRegistableRobot } = useEbmeRobots('ws://localhost:9003');
 *
 *   // 로봇 목록 출력
 *   robotList.forEach(robot => {
 *     console.log(`로봇 ID: ${robot.id}, 이름: ${robot.name}`);
 *   });
 *
 *   // 연결 상태 확인
 *   if (readyState === ReadyState.OPEN) {
 *     console.log('서버와 연결됨');
 *   }
 *  // sample of robotList
 *   [{
      "battery_level": 0,
      "branch_name": "lge",
      "building_name": "blue_pearl",
      "device_id": "cloi",
      "floor": 1,
      "language": "none",
      "last_connect_time": "not_determined",
      "main_state": "standby",
      "map_name": "blue_pearl_map",
      "nickname": "cloi",
      "poi_charge": "not_determined",
      "poi_code": "not_determined",
      "poi_standby": "not_determined",
      "rgb": "not_determined",
      "robot_type": "delivery",
      "sub_state": "not_determined",
      "time_stamp": "2022-11-14 18:55:18",
      "version": "not_determined"
    }]
 */
export const useEbmeRobots = (serverUrl, { autoTrigger = true } = {}) => {
  const prevReadyState = useRef(ReadyState.UNINSTANTIATED)
  const [data, setData] = useState([])
  const [isLoading, setIsLoading] = useState(undefined)
  const [status, setStatus] = useState({
    type: -1,
    success: true
  })

  const { sendJsonMessage, lastMessage, readyState } = useWebSocket(serverUrl, {
    // 1. 재연결 로직 설정 (매우 간단함)
    shouldReconnect: (closeEvent) => true, // 끊기면 항상 재연결 시도
    reconnectAttempts: 10, // 최대 10번 시도
    reconnectInterval: 3000, // 3초 간격

    // 2. 성능 최적화: 불필요한 데이터는 필터링 가능
    filter: (message) => {
      try {
        const data = JSON.parse(message.data)
        console.log('filter:' + data.header)
        return data.header === apiHeader.GetDeviceAll || data.header === apiHeader.SetRobotAdminWithROSDomainID
      } catch {
        return false
      }
      return false
    },
    share: true // 여러 컴포넌트에서 동일한 URL의 소켓을 공유 (중복 연결 방지)
  })

  useEffect(() => {
    if (lastMessage?.data) {
      const data = JSON.parse(lastMessage.data)
      if (data.header === apiHeader.GetDeviceAll) {
        setData(data?.result ? data.result : [])
        console.log(`lastMsg GetDeviceAll result:${JSON.stringify(data)}`)
      } else if (data.header === apiHeader.SetRobotAdminWithROSDomainID) {
        setStatus({ type: apiHeader.SetRobotAdminWithROSDomainID, success: data.result === '1' })
        console.log(`lastMsg SetRobotAdminWithROSDomainID result:${JSON.stringify(data)}`)
      } else {
        console.log(`lastMsg not supported command:${data.header}, result:${data.result}`)
      }
    }
  }, [lastMessage])

  const requestAllRobots = useCallback(() => {
    setStatus({ type: -1, success: true })
    const msg = {
      header: apiHeader.GetDeviceAll,
      messageId: createMessageID()
    }
    console.log(`requestAllRobots`)
    sendJsonMessage(msg)
  }, [sendJsonMessage])

  const addRegisterableRobot = useCallback(
    (deviceId, domainId) => {
      setStatus({ type: -1, success: true })
      const msg = {
        header: apiHeader.SetRobotAdminWithROSDomainID,
        device_id: deviceId,
        ros_domain_id: domainId,
        messageId: createMessageID()
      }
      console.log(`addRegisterableRobot:${deviceId}:${domainId}`)
      sendJsonMessage(msg)
    },
    [sendJsonMessage]
  )

  useEffect(() => {
    if (autoTrigger && prevReadyState.current !== ReadyState.OPEN && readyState === ReadyState.OPEN) {
      setIsLoading(true)
      requestAllRobots()
    }
    prevReadyState.current = readyState
  }, [readyState, requestAllRobots])

  useEffect(() => {
    if (readyState === ReadyState.OPEN && isLoading === true && lastMessage !== null) {
      setIsLoading(false)
    }
  }, [readyState, lastMessage])

  return {
    robotList: data,
    readyState,
    isLoading,
    isConnected: readyState === ReadyState.OPEN,
    status,
    addRegisterableRobot,
    requestAllRobots
  }
}

