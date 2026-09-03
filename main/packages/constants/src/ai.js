export const FRONT_GRAPH_RULE_TYPE = 'front-graph-rule'

export const TMS_APP_KEY = 'tms'
export const TMS_TASKFLOW_DETAIL_ROUTE_KEY = 'tms/taskflows/:taskFlowId/detail'
export const TASKFLOW_CANVAS_RULE_ROUTE_KEY = 'tms/taskflows/:taskFlowId/canvas'

export const AI_TASKFLOW_CANVAS_DRAFT_EVENT = 'ai-assistant:taskflow-canvas-draft'
export const AI_TASKFLOW_CANVAS_CLARIFY_EVENT = 'ai-assistant:taskflow-canvas-clarify'
export const AI_TASKFLOW_CANVAS_COMMAND_EVENT = 'ai-assistant:taskflow-canvas-command'
export const AI_TASKFLOW_CANVAS_RESULT_EVENT = 'ai-assistant:taskflow-canvas-result'
export const AI_TASKFLOW_REFRESH_CONTENTS_EVENT = 'ai-assistant:taskflow-refresh-contents'

// node-*.js 액션의 command.type은 RULE_KEY.NODE_* 값을 그대로 재사용한다.
export const TASKFLOW_CANVAS_COMMAND_TYPE = {
  SAVE: 'save',
  SET_FLOW_MODE: 'set-flow-mode',
  ALIGN: 'align'
}

export const RULE_KEY = {
  TMS_HELP: 'tms-help',
  TASKFLOW_LIST: 'taskflow-list',
  TASKFLOW_DETAIL: 'taskflow-detail',
  ROBOT_LIST: 'robot-list',
  ROBOT_DETAIL: 'robot-detail',
  TASKFLOW_CREATE: 'taskflow-create',
  TASKFLOW_EDIT: 'taskflow-edit',
  TASKFLOW_COPY: 'taskflow-copy',
  TASKFLOW_DELETE: 'taskflow-delete',
  TASKFLOW_DEPLOY: 'taskflow-deploy',
  TASKFLOW_RUN: 'taskflow-run',
  TASKFLOW_PAUSE: 'taskflow-pause',
  TASKFLOW_RESUME: 'taskflow-resume',
  TASKFLOW_STOP: 'taskflow-stop',
  NODE_SAVE_FINAL: 'node-save-final',
  NODE_SAVE_TEMP: 'node-save-temp',
  NODE_CLEAR_ALL: 'node-clear-all',
  NODE_UNDO: 'node-undo',
  NODE_REDO: 'node-redo',
  NODE_RESET: 'node-reset',
  NODE_CONTENTS_REFRESH: 'node-contents-refresh',
  NODE_CREATE_HORIZON: 'node-create-horizon',
  NODE_APPEND_HORIZON: 'node-append-horizon',
  NODE_CREATE_VERTICAL: 'node-create-vertical',
  NODE_APPEND_VERTICAL: 'node-append-vertical',
  NODE_DELETE: 'node-delete',

  // robot 앱 화면 이동 명령 (AI Assistant Rule 탭에서 등록, extraJson.navigation 경로로 이동)
  ROBOT_APP_DASHBOARD: 'robot-app-dashboard',
  ROBOT_APP_MANAGEMENT_LIST: 'robot-app-management-list',
  ROBOT_APP_MAP_LIST: 'robot-app-map-list',
  ROBOT_APP_GROUP_LIST: 'robot-app-group-list',
  ROBOT_APP_USER_LIST: 'robot-app-user-list',
  ROBOT_APP_TERM_LIST: 'robot-app-term-list',

  // robot 앱 이름 기반 상세 이동 (기존 로봇/사이트 목록 API로 이름→ID 조회 후 이동)
  ROBOT_APP_MANAGEMENT_DETAIL: 'robot-app-management-detail',
  ROBOT_APP_SITE_DETAIL: 'robot-app-site-detail'
}
