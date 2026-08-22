import { executeTaskflowInstantAction } from './taskflow-instant.js'

export async function executeTaskflowRun(context = {}) {
  return executeTaskflowInstantAction(context, 'start')
}
