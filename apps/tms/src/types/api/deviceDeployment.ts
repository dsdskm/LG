export interface DeviceLatestDeploymentRequest {
  groupId: string | null
  siteId: string | null
  taskflowId: number
}
export interface DeviceLatestDeploymentResponse {
  content: Content[]
  page: number
  size: number
  totalElements: number
  totalPages: number
  hasNext: true
  hasPrev: true
}

export interface Content {
  robotId: string
  deployments: Deployment[]
}

export interface Deployment {
  id: number
  groupId: string | null
  siteId: string | null
  deploymentId: number
  robotId: string
  taskFlowId: number
  taskFlowSnapshotId: number
  taskFlowVersion: number
  status: string
  retryCount: number
  errorMessage: string
  description: string
  deployedBy: string
  createdAt: string
  completedAt: string
  updatedAt: string
}
