import { findRobotBySiteAndName } from '../../../api/robot.api.js'

/**
 * 사이트와 로봇명으로 로봇을 조회하여 로그 리플레이 페이지를 새 창에서 엽니다
 * @param {Object} context - { rule, params, navigate }
 * params[0]: siteName, params[1]: robotName, params[2]: logType ('driving' or 'manipulation')
 */
export async function executeLogReplayByName(context = {}) {
  const { rule, params, navigate } = context

  if (!params || params.length < 3) {
    return rule?.fallbackText || '로봇명을 확인해주세요'
  }

  const siteName = String(params[0] || '').trim()
  const robotName = String(params[1] || '').trim()
  const logType = String(params[2] || 'driving').trim().toLowerCase()

  // 로봇명은 필수, 사이트명은 선택사항
  if (!robotName) {
    return '로봇명을 확인해주세요'
  }

  // logType 유효성 검사
  if (!['driving', 'manipulation'].includes(logType)) {
    return '주행 로그 또는 조작 로그만 지원합니다'
  }

  console.log(`[robot-logreplay][executeLogReplayByName] siteName=${siteName}, robotName=${robotName}, logType=${logType}`)

  try {
    // API 호출
    const result = await findRobotBySiteAndName(siteName, robotName)

    if (result.status === 'success') {
      const robotId = result.robot.deviceId

      // 로그 타입에 따라 다른 URL 생성
      let logreplayUrl
      let pageTitle

      if (logType === 'driving') {
        logreplayUrl = `${window.location.origin}/robot/logreplay?deviceId=${encodeURIComponent(robotId)}`
        pageTitle = '주행 로그 리플레이'
      } else if (logType === 'manipulation') {
        logreplayUrl = `${window.location.origin}/robot/replaycontrols?deviceId=${encodeURIComponent(robotId)}`
        pageTitle = '조작 로그 리플레이'
      }

      console.log(`[robot-logreplay][executeLogReplayByName] Opening ${pageTitle}: ${logreplayUrl}`)

      // 새 창 열기
      const newWindow = window.open(logreplayUrl, '_blank')

      // 팝업 차단 감지
      if (!newWindow || newWindow.closed || typeof newWindow.closed === 'undefined') {
        return `${robotName} 로봇의 ${pageTitle}가 준비되었습니다.\n팝업이 차단되었습니다. 브라우저 팝업 차단을 해제하거나 이 링크를 직접 열어주세요: ${logreplayUrl}`
      }

      return `${robotName} 로봇의 ${pageTitle}를 새 창에서 열었습니다`
    }

    if (result.status === 'multiple') {
      // 2대 이상인 경우 → AI Assistant에 로봇 목록 표시
      const robotsList = result.robots.map((robot) => ({
        deviceId: robot.deviceId,
        deviceName: robot.deviceName,
        macAddress: robot.deviceMacAddress || 'N/A'
      }))

      // Interactive multi-select response 반환
      return {
        type: 'multi-select-robot',
        componentKey: 'robot',
        message: `동일 이름의 로봇이 ${result.robots.length}대 있습니다. 선택해주세요:`,
        robots: robotsList,
        logType: logType,
        robotName: robotName
      }
    }

    return result.message
  } catch (error) {
    console.error('[robot-logreplay][executeLogReplayByName] error:', error)
    return rule?.fallbackText || '로그 조회 중 오류가 발생했습니다'
  }
}
