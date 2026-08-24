import { executeTaskflowInstantAction } from './taskflow-instant.js'

export async function executeTaskflowPause(context = {}) {
  return executeTaskflowInstantAction(context, 'startPause')
}
