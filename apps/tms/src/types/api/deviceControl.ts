type ActionParameterValue = string | number | boolean | Array<string | number | boolean>
export type BlockingType = 'NONE' | 'SOFT' | 'HARD'

export interface ActionParameter {
  key: string
  value: ActionParameterValue
}

export interface InstantAction {
  actionType: string // 'reboot', 'cancelOrder', ...
  actionId: string // unique id (uuid 권장)
  blockingType: BlockingType
  actionParameters?: ActionParameter[] // 없을 수도 있어서 optional
  actionDescription?: string // VDA5050 optional 필드
}

export interface InstantActionsPayload {
  headerId: number
  timestamp: string // ISO8601 (new Date().toISOString())
  instantActions: InstantAction[]
}

export interface InstantActionsRequestBody {
  userId: string
  payload: InstantActionsPayload
}

export interface InstantActionsRequest {
  deviceId: string
  body: InstantActionsRequestBody
}
