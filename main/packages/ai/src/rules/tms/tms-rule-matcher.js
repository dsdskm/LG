import { matchChatRule } from '@repo/apis/ai/chatSettings.js'
import { detectFrontGraphRule, parseFrontGraphRule, executeFrontGraphRule } from './immediate-rules/index.js'
import { matchLocalRule } from './local-rule-matcher.js'
import { executeTmsHelp } from './actions/tms-help.js'
import { executeGoPage } from './actions/taskflow-move-page.js'
import { executeTaskflowCopy } from './actions/taskflow-copy.js'
import { executeTaskflowDelete } from './actions/taskflow-delete.js'
import { executeTaskflowDeploy } from './actions/taskflow-deploy.js'
import { executeTaskflowRun } from './actions/taskflow-run.js'
import { executeTaskflowPause } from './actions/taskflow-pause.js'
import { executeTaskflowResume } from './actions/taskflow-resume.js'
import { executeTaskflowStop } from './actions/taskflow-stop.js'
import { executeNodeSaveFinal } from './actions/node-save-final.js'
import { executeNodeSaveTemp } from './actions/node-save-temp.js'
import { executeNodeClearAll } from './actions/node-clear-all.js'
import { executeNodeUndo } from './actions/node-undo.js'
import { executeNodeRedo } from './actions/node-redo.js'
import { executeNodeReset } from './actions/node-reset.js'
import { executeNodeContentsRefresh } from './actions/node-contents-refresh.js'
import { executeNodeDelete } from './actions/node-delete.js'
import { RULE_KEY } from '@repo/constants/ai'

export const ruleCheck = async (appKey, screenKey, message, navigate, context = {}) => {
  const text = String(message || '').trim()

  if (!text) {
    return {
      ok: false,
      replyText: ''
    }
  }

  const localRule = await matchLocalRule(screenKey, text, { signal: context.signal })
  if (localRule) return localRule

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
  const availableScreenKeys = Array.isArray(payload.availableScreenKeys)
    ? payload.availableScreenKeys.map((key) => String(key ?? '').trim()).filter(Boolean)
    : []

  if (!rule && availableScreenKeys.length > 0) {
    return {
      ok: true,
      replyText:
        availableScreenKeys.length === 1
          ? `이 명령어는 ${availableScreenKeys[0]} 화면에서만 사용할 수 있습니다.`
          : `이 명령어는 다음 화면에서만 사용할 수 있습니다: ${availableScreenKeys.join(', ')}`
    }
  }

  if (rule) {
    console.log(`rule`,rule)
    const ruleKey = rule.ruleKey

    // 캔버스 draft 를 만드는 룰(ruleType=taskflow-graph)은 백엔드가 노드 이름/순번을 해석해 draft 까지 만든다.
    // 여기서 replyText 만 보여 주면 문구의 {{anchor}} 자리가 그대로 남고 캔버스도 바뀌지 않는다.
    if (String(rule?.extraJson?.ruleType ?? '').trim() === 'taskflow-graph') {
      return {
        ok: false,
        replyText: ''
      }
    }

    let replyText = rule.replyText
    switch (ruleKey) {
      case RULE_KEY.TMS_HELP:
        replyText = await executeTmsHelp({
          rule,
          params,
          screenKey: context.screenKey ?? screenKey
        })
        break
      case RULE_KEY.TASKFLOW_LIST:
      case RULE_KEY.ROBOT_LIST:
      case RULE_KEY.TASKFLOW_CREATE:
        executeGoPage({ rule, navigate, params })
        break
      case RULE_KEY.TASKFLOW_EDIT:
      case RULE_KEY.TASKFLOW_DETAIL:
      case RULE_KEY.ROBOT_DETAIL:
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
      case RULE_KEY.NODE_SAVE_FINAL:
        replyText = await executeNodeSaveFinal({ rule, replyText })
        break
      case RULE_KEY.NODE_SAVE_TEMP:
        replyText = await executeNodeSaveTemp({ rule, replyText })
        break
      case RULE_KEY.NODE_CLEAR_ALL:
        replyText = await executeNodeClearAll({ rule, replyText })
        break
      case RULE_KEY.NODE_UNDO:
        replyText = await executeNodeUndo({ rule, replyText })
        break
      case RULE_KEY.NODE_REDO:
        replyText = await executeNodeRedo({ rule, replyText })
        break
      case RULE_KEY.NODE_RESET:
        replyText = await executeNodeReset({ rule, replyText })
        break
      case RULE_KEY.NODE_CONTENTS_REFRESH:
        replyText = await executeNodeContentsRefresh({ rule, replyText })
        break
      case RULE_KEY.NODE_CREATE_HORIZON:
      case RULE_KEY.NODE_APPEND_HORIZON: {
        const nodeNames = (Array.isArray(params) ? params : [])
          .map((value) => String(value || '').trim())
          .filter(Boolean)
        const isAppendRule = ruleKey === RULE_KEY.NODE_APPEND_HORIZON
        const expectedNodeCount = isAppendRule ? 1 : 2

        if (nodeNames.length !== expectedNodeCount) {
          replyText =
            rule.fallbackText ||
            (isAppendRule ? '추가할 노드의 이름을 확인해주세요.' : '연결할 두 노드의 이름을 확인해주세요.')
          break
        }

        const canvasCommand = isAppendRule ? `->${nodeNames[0]}` : nodeNames.join('->')
        const canvasRule = await matchLocalRule(screenKey, canvasCommand, {
          signal: context.signal,
          ruleKey,
          replyText,
          originalMessage: text
        })
        if (canvasRule) return canvasRule
        replyText = rule.fallbackText || '이 명령어는 Canvas 화면에서만 사용할 수 있습니다.'
        break
      }
      case RULE_KEY.NODE_DELETE:
        replyText = await executeNodeDelete({ rule, params, replyText })
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
