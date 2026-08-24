import { executeTaskflowInstantAction } from './taskflow-instant.js'

export async function executeTaskflowStop(context = {}) {
  return executeTaskflowInstantAction(context, 'stop')
}
