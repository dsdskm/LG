import { robotClient } from '@repo/apis'
import { ENDPOINTS, GETSIZE } from './constants'

const axiosRobot = robotClient(import.meta.env.VITE_API_BASE_URL)
const isRefactoryTemp = import.meta.env.VITE_BE_REFACTORY_TEMP
  ? import.meta.env.VITE_BE_REFACTORY_TEMP == 'Y'
    ? true
    : false
  : false
const pathDevices = isRefactoryTemp ? '/api/v1/devices' : ENDPOINTS.ROBOT.DEVICES

/**
 * 로봇 목록 조회
 * @returns {Promise<any>}
 */

export const getDevices = async (params = undefined) => {
  const size = GETSIZE

  const response = await axiosRobot.get(pathDevices, {
    params: {
      size,
      ...(params ?? {}) // params가 있으면 추가
    }
  })
  return response
}

/**
 * 로봇 정보 조회
 * @returns {Promise<any>}
 */
export const getDeviceInfo = async (deviceId) => {
  const response = await axiosRobot.get(pathDevices + '/' + deviceId)
  return response
}

/**
 * 로봇 정보 수정
 * @returns {Promise<any>}
 */
export const putDeviceInfo = async (deviceId, deviceName) => {
  const response = await axiosRobot.put(pathDevices + '/' + deviceId, {
    deviceName
  })
  return response
}

/**
 * 로봇 사이트 배정
 * @returns {Promise<any>}
 */
export const putDeviceAssignment = async (deviceId, body) => {
  const response = await axiosRobot.put(pathDevices + '/' + deviceId + '/site', body)
  return response
}

/**
 * 기기 즉시 삭제 (웹 관리자용)
 * DELETE [Base URL]/api/v1/web/devices/{deviceId}/force
 * @returns {Promise<any>}
 */
export const deleteDeviceForce = async (deviceId) => {
  const response = await axiosRobot.delete(pathDevices + '/' + deviceId + '/force')
  return response
}

/**
 * 에러 리스트
 * @returns {Promise<any>}
 */
export const getDeviceErrors = async (deviceId, params = undefined) => {
  const size = GETSIZE

  const response = await axiosRobot.get(pathDevices + '/' + deviceId + '/error', {
    params: {
      size,
      ...(params ?? {}) // params가 있으면 추가
    }
  })
  return response
}

/**
 * 전체 알림 리스트 조회
 * @returns {Promise<any>}
 */
export const getDeviceNotifications = async (params = undefined) => {
  const { size, ...rest } = params ?? {}

  const response = await axiosRobot.get(pathDevices + '/notification', {
    params: {
      size: size ?? GETSIZE, // params에 size가 있으면 그 값을 우선 사용
      ...rest
    }
  })
  return response
}

/**
 * instantActions
 * @returns {Promise<any>}
 */
export const postInstanceActions = async (deviceId, params) => {
  const path = pathDevices + '/' + deviceId + '/instantActions'
  const response = await axiosRobot.post(path, params)
  return response
}

/**
 * 기기 제어 로그 목록 조회
 * @returns {Promise<any>}
 */
export const getDeviceControlHistory = async (deviceId, params) => {
  const size = GETSIZE

  const response = await axiosRobot.get(pathDevices + '/' + deviceId + '/control', {
    params: {
      size,
      ...(params ?? {}) // params가 있으면 추가
    }
  })
  return response
}
