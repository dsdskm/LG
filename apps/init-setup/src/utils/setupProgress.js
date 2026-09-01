import { toast } from 'react-toastify'
import { create, list, update } from '@/apis/robotSetupApis'
import { resetRobotSetupCache } from '@/hooks/useRobotSetupStatus'

/**
 * 설치 진행 상태(robot_setups)를 갱신하는 공용 로직.
 *
 * robot_setups 는 '이 로봇의 셋업 설정 1건' 이므로 레코드를 누적하지 않고 최신 1건을 갱신한다
 * (없으면 만든다) — FE 는 어디서나 최신 1건만 읽으므로(hooks/useRobotSetupStatus) 상태가 한 곳에 모인다.
 *
 * 필드 의미는 router/routes.jsx 가 정한다.
 * - currentStep: '지금 작업 중인 단계' (SETUP_STEP_ROUTES 의 1-based 위치).
 *   getSetupLandingPath 가 착지 화면을, getSetupProgress 가 여기까지의 열림 범위를 계산한다.
 * - status: 'draft' = 셋업 진행 중 / 'completed' = 초기 설정(언어~약관)을 끝낸 상태.
 *   App.jsx 가 이 값으로 초기 설정 그룹을 헤더 탭·사이드바·라우트에서 감추고,
 *   getSetupProgress 는 단계 순서 잠금을 모두 푼다.
 *
 * 단계 번호는 routes.jsx 의 SETUP_STEP_ROUTES 순서와 같다. routes.jsx 를 import 해서 계산하면
 * routes → pages → 이 모듈 → routes 로 순환 참조가 되므로 상수로 둔다.
 */
// 네트워크(Wi-Fi) 설정은 설치 단계에서 빠졌다(routes.jsx SETUP_GROUP.NETWORK) — 번호가 한 칸씩 당겨진다.
export const SETUP_STEPS = {
  LANGUAGE: 1,
  SITE_CODE: 2,
  LOCATION: 3,
  ROBOT_INFO: 4,
  TERMS: 5,
  MAP_SCAN: 6,
  MAP_SEMANTIC: 7,
  UPLOAD: 8
}

/** 최신 robotSetup 1건 (없으면 null). 캐시(useRobotSetupStatus)가 아니라 항상 서버 값을 읽는다. */
const fetchLatest = async () => {
  const response = await list({ limit: 1 })
  return response?.data?.[0] || null
}

/** 조회해 둔 최신 1건을 갱신하거나(없으면) 새로 만든다. 성공 시 앱 진입 캐시를 비운다. */
const saveOn = async (latest, fields) => {
  const saved = latest?.id ? await update(latest.id, fields) : await create(fields)
  resetRobotSetupCache()
  return saved
}

const upsertLatest = async (fields) => saveOn(await fetchLatest(), fields)

/**
 * 작업 중인 단계를 currentStep 으로 옮긴다 (status 는 'draft' 유지).
 *
 * 이미 전역 완료(status 'completed')인 로봇은 건드리지 않는다 — 업로드까지 끝낸 뒤 맵을 다시 스캔하는
 * 경우가 있는데, 그때 draft 로 되돌리면 완료 이력이 사라져 초기 설정 메뉴가 다시 나타나고
 * 뒷 단계가 잠긴다.
 *
 * @param {number} currentStep SETUP_STEPS 값
 * @returns {Promise<{skipped: boolean}>} skipped: 이미 완료된 셋업이라 기록하지 않음
 */
export const advanceSetupProgress = async (currentStep) => {
  const latest = await fetchLatest()
  if (latest?.status === 'completed') return { skipped: true }

  await saveOn(latest, { status: 'draft', currentStep })
  return { skipped: false }
}

/**
 * advanceSetupProgress 의 '실패해도 흐름을 막지 않는' 버전.
 *
 * 단계 완료 기록은 이미 끝난 작업(맵 저장 · POI 저장)의 후처리라서, 실패를 화면 흐름으로 올리면
 * 정작 성공한 저장이 실패처럼 보인다. 그래서 토스트로만 알린다.
 *
 * @param {number} currentStep SETUP_STEPS 값
 */
export const tryAdvanceSetupProgress = async (currentStep) => {
  try {
    await advanceSetupProgress(currentStep)
  } catch (error) {
    const message = error?.response?.data?.error?.message || error?.message || 'Request failed'
    toast.warn(`Setup progress not saved: ${message}`, { autoClose: 4000 })
  }
}

/**
 * 초기 설정(언어~약관) 완료 처리 — 약관 동의의 '완료' 에서 호출한다.
 *
 * status 를 'completed' 로 올리는 것이 헤더에서 초기 설정 탭을 감추는 값이다(App.jsx setupCompleted:
 * headerRoutes / visibleAppRoutes 가 SETUP_GROUP.INITIAL 을 제거한다). 작업 중인 단계는 다음 단계인
 * 맵 스캔으로 옮긴다.
 *
 * 이 상태는 단계 순서 잠금도 함께 푼다(routes.jsx getSetupProgress) — 초기 설정을 마친 뒤에는
 * 맵 스캔·시맨틱을 거치지 않고 업로드 화면으로 바로 들어갈 수 있다.
 */
export const completeInitialSetup = () => upsertLatest({ status: 'completed', currentStep: SETUP_STEPS.MAP_SCAN })

/**
 * 셋업 전역 완료 처리 (마지막 단계인 업로드에서 호출한다).
 * 초기 설정 완료로 이미 'completed' 이므로 여기서는 작업 단계를 마지막(업로드)으로 확정하는 의미다.
 */
export const completeSetup = () => upsertLatest({ status: 'completed', currentStep: SETUP_STEPS.UPLOAD })
