interface DeployRequest {
  groupId: string | null
  siteId: string | null
  robotIds: string[]
  taskFlowId: number
  description?: string
  behaviorTree?: string
}

interface DeployResponse {}
