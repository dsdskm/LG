export type RobotStatus = 'POWEROFF' | 'OFFLINE' | 'ERROR' | 'CHARGE' | 'STANDBY' | 'OPERATION'
export type TaskFlowRunningStatus = 'READY' | 'RUNNING' | 'PAUSED' | 'CANCELED' | 'STOPPED' | 'FAILURE' | 'SUCCESS'
export type TaskStatus = 'IDLE' | 'SUCCESS' | 'FAILURE' | 'SKIPPED' | 'RUNNING'
export type SkillType = 'NAVIGATION' | 'MANIPULATION' | 'PERCEPTION' | 'DISPLAY' | 'VOICE'
export type DeployStatusType = 'QUEUED'

export interface RobotInfo {
  id: string
  name: string
  group: string
  site: string
  groupId: string
  siteId: string
  status: RobotStatus
  batteryLevel: number
  skills: SkillType[]
  errorCode: string
  errorMessage: string
  installedTaskFlows?: TaskFlowInfo[]
  deployable?: Deployable
  installedTaskFlowCount?: number
  runningTaskFlowId?: number
  runningTaskFlowName?: string
  runningTaskFlowStatus?: TaskFlowRunningStatus
  deployStatus?: DeployStatus
}
export interface Deployable {
  deployable: boolean
  reason: string
}

export interface DeployStatus {
  taskFlowId: number
  taskFlowVersion: number
  status: DeployStatusType
}

export interface TaskFlowInfo {
  id: string
  name: string
  version: number
  runningStatus: TaskFlowRunningStatus
  isActive: boolean
  isUsing: boolean
  taskResults: TaskInfo[]
}

export interface TaskInfo {
  nodeId: string
  name: string
  updateTime: string
  runningCount: number
  status: TaskStatus
}
