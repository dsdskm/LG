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
  /** taskflow 도구가 쓰는 문구 묶음. prompt 본문에 JSON 객체로 키별 템플릿을 담는다. */
  toolTaskflowMessage: 'tool-taskflow-message',
  /** read_taskflow_graph 설명. */
  toolReadTaskflowGraph: 'tool-read-taskflow-graph',
} as const