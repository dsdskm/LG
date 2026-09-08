import { CHAT_PROMPT_TYPE } from '../../features/chat/prompt-types'
import { readMessageNumber, renderMessage } from '../message-bundle.util'

/** taskflow 도구와 prompt 조회가 같이 쓰는 캔버스 화면 키. */
export const TASKFLOW_CANVAS_SCREEN_KEY = 'tms/taskflows/:taskFlowId/canvas'

/** prompt 테이블의 action-tools 행에 JSON 으로 들어 있는 키들. */
export const TASKFLOW_MESSAGE_KEY = {
  /** action tool 사용 규칙. {{mutatingTools}} 를 채운다. */
  policy: 'policy',
  toolCompose: 'tool.compose',
  toolEdit: 'tool.edit',
  toolReadGraph: 'tool.readGraph',

  nodeLabel: 'node.label',
  graphEmpty: 'graph.empty',
  graphChildren: 'graph.children',
  graphNext: 'graph.next',

  composeDone: 'compose.done',
  composeSubstituted: 'compose.substituted',
  composePlaceholders: 'compose.placeholders',
  composeMissing: 'compose.missing',
  composeUnresolved: 'compose.unresolved',
  composeRootRequired: 'compose.rootRequired',
  composeDepthSkipped: 'compose.depthSkipped',
  composeParentMissing: 'compose.parentMissing',
  composeTaskNotFound: 'compose.taskNotFound',
  composeEmptyControl: 'compose.emptyControl',
  composeSuggestionLimit: 'compose.suggestionLimit',
  composeConcurrentRule: 'compose.concurrentRule',
  composeAlternativeRule: 'compose.alternativeRule',
  composeTaskJoiner: 'compose.taskJoiner',
  composeParamNodes: 'compose.param.nodes',
  composeParamDepth: 'compose.param.depth',
  composeParamTaskName: 'compose.param.taskName',
  composeParamContentName: 'compose.param.contentName',
  composeParamProperties: 'compose.param.properties',
  composeUnknownProperties: 'compose.unknownProperties',

  editDone: 'edit.done',
  editPlaceholders: 'edit.placeholders',
  editMissing: 'edit.missing',
  editAmbiguous: 'edit.ambiguous',
  editEmptyCanvas: 'edit.emptyCanvas',
  editAmbiguousClarification: 'edit.ambiguousClarification',
  editNotFound: 'edit.notFound',
  editAppliedRemove: 'edit.appliedRemove',
  editAppliedReplace: 'edit.appliedReplace',
  editAppliedClone: 'edit.appliedClone',
  editAppliedProperty: 'edit.appliedProperty',
  editAppliedRole: 'edit.appliedRole',
  editAppliedAppend: 'edit.appliedAppend',
  editAppliedAppendAfter: 'edit.appliedAppendAfter',
  editAppliedAppendBranch: 'edit.appliedAppendBranch',
  editCloneTargetMissing: 'edit.cloneTargetMissing',
  editPlaceholderPair: 'edit.placeholderPair',
  editAmbiguousEntry: 'edit.ambiguousEntry',
  editParamOperations: 'edit.param.operations',
  editParamAction: 'edit.param.action',
  editParamTarget: 'edit.param.target',
  editParamAfter: 'edit.param.after',
  editParamTaskName: 'edit.param.taskName',
  editParamContentName: 'edit.param.contentName',
  editParamBranch: 'edit.param.branch',
  editParamAll: 'edit.param.all',
  editParamRefId: 'edit.param.refId',
  editParamProperties: 'edit.param.properties',
  editParamChild: 'edit.param.child',
  editParamRole: 'edit.param.role',
  /** 스키마에 없는 속성 키를 알리는 문구. */
  editUnknownProperties: 'edit.unknownProperties',
} as const

export function taskflowMessage(key: string, vars: Record<string, string> = {}): string {
  return renderMessage(TASKFLOW_CANVAS_SCREEN_KEY, CHAT_PROMPT_TYPE.actionTools, key, vars)
}

export function taskflowMessageNumber(key: string): number {
  return readMessageNumber(TASKFLOW_CANVAS_SCREEN_KEY, CHAT_PROMPT_TYPE.actionTools, key)
}
