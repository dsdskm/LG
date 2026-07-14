import type { TFunction } from 'i18next'
import { TaskFlowStatus } from '@/types/taskflow'
import type { TaskFlowRunningStatus } from '@/types/RobotInfo'

/**
 * TaskFlowStatus 값을 사용자 표시용 라벨(i18n)로 변환한다.
 * 모든 화면(목록/상세/캔버스 헤더)이 동일한 매핑을 쓰도록 단일 소스로 둔다.
 * locale 키: tms.json 의 detail.status.*
 */
export function getTaskFlowStatusLabel(
  status: TaskFlowStatus | string | null | undefined,
  t: TFunction
): string {
  switch (status) {
    case TaskFlowStatus.DRAFT:
      return t('detail.status.draft')
    case TaskFlowStatus.ACTIVE:
      return t('detail.status.activated')
    case TaskFlowStatus.INACTIVE:
      return t('detail.status.deactivated')
    case TaskFlowStatus.DISABLED:
      return t('detail.status.disabled')
    default:
      return ''
  }
}

/**
 * 로봇 실행(taskflow) 상태값을 사용자 표시용 라벨(i18n)로 변환한다.
 * locale 키: tms.json 의 robots.runningStatus.*
 */
export function getRunningTaskFlowStatusLabel(
  status: TaskFlowRunningStatus | string | null | undefined,
  t: TFunction
): string {
  if (!status) return ''
  return t(`robots.runningStatus.${status}`)
}
