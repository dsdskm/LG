import { matchChatRule } from '@repo/apis/ai/chatSettings.js'
import { detectFrontGraphRule, parseFrontGraphRule, executeFrontGraphRule } from './rules/tms/immediate-rules/index.js'
import { executeGoPage } from './rules/tms/actions/taskflow-move-page.js'
import { executeTaskflowCopy } from './rules/tms/actions/taskflow-copy.js'
import { executeTaskflowDelete } from './rules/tms/actions/taskflow-delete.js'
import { executeTaskflowDeploy } from './rules/tms/actions/taskflow-deploy.js'
import { executeTaskflowRun } from './rules/tms/actions/taskflow-run.js'
import { executeTaskflowPause } from './rules/tms/actions/taskflow-pause.js'
import { executeTaskflowResume } from './rules/tms/actions/taskflow-resume.js'
import { executeTaskflowStop } from './rules/tms/actions/taskflow-stop.js'
import { RULE_KEY } from '../../constants/src/ai.js'

export const ruleCheck = async (appKey, screenKey, message, navigate, context = {}) => {
  const text = String(message || '').trim()

  if (!text) {
    return {
      ok: false,
      replyText: ''
    }
  }

  const isTmsGraphRule = Boolean(
    detectFrontGraphRule(text, {
      screenKey,
      pathname: screenKey,
      allowFrontGraphRule: true
    })
  )

  if (isTmsGraphRule) {
    const parsed = parseFrontGraphRule(text)
    executeFrontGraphRule(parsed)

    return {
      ok: true,
      replyText: '노드 작업을 반영했습니다.'
    }
  }

  const response = await matchChatRule({
    appKey,
    screenKey,
    message: text
  })

  const payload = response.data || {}
  const rule = payload.rule
  const params = payload.params
  if (rule) {
    const ruleKey = rule.ruleKey
    let replyText = rule.replyText
    switch (ruleKey) {
      case RULE_KEY.TASKFLOW_LIST:
      case RULE_KEY.ROBOT_LIST:
      case RULE_KEY.TASKFLOW_CREATE:
        executeGoPage({ rule, navigate, params })
        break
      case RULE_KEY.TASKFLOW_EDIT:
        replyText = executeGoPage({ rule, navigate, params })
        break
      case RULE_KEY.TASKFLOW_COPY:
        replyText = await executeTaskflowCopy({ rule, params, replyText })
        break
      case RULE_KEY.TASKFLOW_DELETE:
        replyText = await executeTaskflowDelete({ rule, params, replyText })
        break
      case RULE_KEY.TASKFLOW_DEPLOY:
        replyText = await executeTaskflowDeploy({
          rule,
          params,
          replyText,
          groupId: context.groupId,
          siteId: context.siteId,
          description: context.description
        })
        break
      case RULE_KEY.TASKFLOW_RUN:
        replyText = await executeTaskflowRun({ rule, params, replyText, userId: context.userId })
        break
      case RULE_KEY.TASKFLOW_PAUSE:
        replyText = await executeTaskflowPause({ rule, params, replyText, userId: context.userId })
        break
      case RULE_KEY.TASKFLOW_RESUME:
        replyText = await executeTaskflowResume({ rule, params, replyText, userId: context.userId })
        break
      case RULE_KEY.TASKFLOW_STOP:
        replyText = await executeTaskflowStop({ rule, params, replyText, userId: context.userId })
        break

      default:
        break
    }
    return {
      ok: true,
      replyText
    }
  }

  return {
    ok: false,
    replyText: ''
  }
}
