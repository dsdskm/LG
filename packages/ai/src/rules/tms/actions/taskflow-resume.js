import { executeTaskflowInstantAction } from './taskflow-instant.js'

export async function executeTaskflowResume(context = {}) {
  return executeTaskflowInstantAction(context, 'stopPause')
}
