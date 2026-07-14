import { RobotStatus } from '@/types/RobotInfo'

export function isStartContent(content: any) {
  // 너 데이터에 맞게 하나만 남기고 나머지는 지워도 됨
  return (
    content?.id === 'control_start' ||
    content?.key === '_start' ||
    content?.type === '_start' ||
    content?.name === '시작'
  )
}

export const toRobotStatus = (deviceState: RobotStatus): string => {
  switch (deviceState) {
    case 'POWEROFF':
      return '전원 off'
    case 'OFFLINE':
      return '네트워크 끊김'
    case 'ERROR':
      return '에러'
    case 'CHARGE':
      return '충전중'
    case 'STANDBY':
      return '대기중'
    case 'OPERATION':
      return '운영중'
    default:
      return '에러'
  }
}
