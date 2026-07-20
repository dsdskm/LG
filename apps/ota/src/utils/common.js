import { CAMPAIGN_STATUS, DEPLOYMENT_STATUS } from '@/constants/campaign'
import { ARTIFACT_STATUS } from '@/constants/artifact'
import { DEVICE_STATUS } from '@/constants/device'

const statusToProgress = (status) => {
  switch (status) {
    case 'ready':
      return 0
    case 'draft':
      return 0
    case 'process':
      return 50
    case 'success':
      return 100
    case 'done':
      return 100
    case 'fail':
      return 0
    default:
      return 0
  }
}

const statusToColor = (status) => {
  switch (status) {
    case CAMPAIGN_STATUS.COMPLETED:
    case DEPLOYMENT_STATUS.SUCCEEDED:
    case ARTIFACT_STATUS.SUCCESS:
    case DEVICE_STATUS.RUNNING:
      return '#0f9d58' // Green

    case CAMPAIGN_STATUS.CANCELED:
    case DEPLOYMENT_STATUS.FAILED:
    case DEPLOYMENT_STATUS.TIMED_OUT:
    case DEPLOYMENT_STATUS.REJECTED:
    case DEPLOYMENT_STATUS.CANCELED:
    case DEPLOYMENT_STATUS.REMOVED:
    case ARTIFACT_STATUS.FAILED:
    case DEVICE_STATUS.STOPPED:
    case DEVICE_STATUS.NO_RESPONSE:
    case 'rollback':
      return '#ea4335' // Red

    case CAMPAIGN_STATUS.SCHEDULED:
    case DEPLOYMENT_STATUS.IN_PROGRESS:
    case DEVICE_STATUS.IN_PROGRESS:
      return '#1a73e8' // Blue

    default:
      return '#5f6368' // Gray
  }
}

const statusToBgColor = (status) => {
  switch (status) {
    case CAMPAIGN_STATUS.COMPLETED:
    case DEPLOYMENT_STATUS.SUCCEEDED:
    case ARTIFACT_STATUS.SUCCESS:
    case DEVICE_STATUS.RUNNING:
      return '#e6f4ea'

    case CAMPAIGN_STATUS.CANCELED:
    case DEPLOYMENT_STATUS.FAILED:
    case DEPLOYMENT_STATUS.TIMED_OUT:
    case DEPLOYMENT_STATUS.REJECTED:
    case DEPLOYMENT_STATUS.CANCELED:
    case DEPLOYMENT_STATUS.REMOVED:
    case ARTIFACT_STATUS.FAILED:
    case DEVICE_STATUS.STOPPED:
    case DEVICE_STATUS.NO_RESPONSE:
    case 'rollback':
      return '#fce8e6'

    case CAMPAIGN_STATUS.SCHEDULED:
    case DEPLOYMENT_STATUS.IN_PROGRESS:
    case DEVICE_STATUS.IN_PROGRESS:
      return '#e8f0fe'

    default:
      return '#f1f3f4'
  }
}

export { statusToProgress, statusToColor, statusToBgColor }
