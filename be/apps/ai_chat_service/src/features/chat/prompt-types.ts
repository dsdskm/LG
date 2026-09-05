export const CHAT_PROMPT_TYPE = {
  instruction: 'instruction',
  intentClassifier: 'intent-classifier',
  ragInfo: 'rag-info',
  ragAction: 'rag-action',
  /** action tool 사용 규칙. {{mutatingTools}} 에 변경 tool 이름이 들어간다. */
  actionToolPolicy: 'action-tool-policy',
  /** compose_linear_taskflow 설명. {{catalog}} 에 Task 카탈로그가 들어간다. */
  toolComposeTaskflow: 'tool-compose-taskflow',
  /** edit_taskflow 설명. {{catalog}} 에 Task 카탈로그가 들어간다. */
  toolEditTaskflow: 'tool-edit-taskflow',
} as const