export interface DeviceParams {
  groupId?: (string | null)[]
  siteId?: (string | null)[]
}

export interface DeviceListResponse {
  content: DeviceResponse[]
  page: number
  size: number
  totalElements: number
  totalPages: number
  hasNext: boolean
  hasPrev: boolean
}

export interface DeviceResponse {
  deviceId: string
  deviceOriginalId: string
  deviceSerialNumber: string
  deviceMacAddress: string
  deviceModelName: string
  deviceFirmwareVersion: string
  deviceName: string
  deviceRegStatus: string
  deviceState: string
  deviceStateUpdatedAt: string
  registeredAt: string
  updatedAt: string
  assign: Assign
  provision: Provision
  connection: Connection
  state?: State
  tms?: Tms
}

interface Tms {
  taskFlowState: TaskFlowState
  createdAt: string
  updatedAt: string
}

interface State {
  orderId: string
  orderUpdateId: number
  lastNodeId: string
  lastNodeSequenceId: number
  driving: boolean
  operatingMode: 'AUTOMATIC' | 'MANUAL'
  batteryState?: BatteryState
  batteryCharging?: boolean
  paused?: null
  hasError?: boolean
  hwComponents?: string
  hwComponentsUpdatedAt?: string
  sensors?: null
  sensorsUpdatedAt?: null
  sWmodules?: null
  sWmodulesUpdatedAt?: null
  stateCreatedAt: '2026-05-21T00:37:54.343Z'
  stateUpdatedAt: '2026-05-21T00:37:54.343Z'
}

interface TaskFlowState {
  robotSpec: RobotSpec
  taskFlows: RobotTaskFlow[]
  runningTaskFlowStatus: RunningTaskFlowStatus
}

interface RunningTaskFlowStatus {
  taskFlowId: number
  startTime: string
  tickTime: string
  activePath: NodeStatus[]
  changedTasks: NodeStatus[]
}

export interface NodeStatus {
  nodeId: string
  name: string
  nodeType: string
  udpateTime: string
  status: string
  runningCount: number
}

interface RobotSpec {
  capabilities: SpecItem[]
  actions: SpecItem[]
}

interface SpecItem {
  name: string
  properties?: {}
}

export interface RobotTaskFlow {
  name: string
  id: number
  version: number
  isActive: boolean
  isEnabled: boolean
  operationStatus: string
}

interface BatteryState {
  charging: boolean
  batteryCharge: number
  batteryHealth: number
  batteryVoltage: number
}

interface Assign {
  groupId: string | null
  groupName: string
  siteId: string | null
  siteName: string
  deviceAlias: string
  assignedAt: string
  assignUpdatedAt: string
}

interface Provision {
  certificateId: string
  apiKey: string
  organization: string
  isDefaultSite: boolean
  groupId: string | null
  groupName: string
  siteId: string | null
  siteName: string
  provisionCreatedAt: string
  provisionUpdatedAt: string
}

interface Connection {
  connectionState: string
  messageTimestamp: string
  connectionCreatedAt: string
  connectionUpdatedAt: string
}
