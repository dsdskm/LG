export const CHAT_PROMPT_TYPE = {
  instruction: 'instruction',
  intentClassifier: 'intent-classifier',
  ragInfo: 'rag-info',
  ragAction: 'rag-action',
  /** 액션 수행에 필요한 프롬프트 묶음. 행 하나에 JSON 으로 담는다.
   * policy: action tool 사용 규칙({{mutatingTools}} 주입)
   * tool.compose / tool.edit / tool.readGraph: 각 도구의 description({{catalog}} 주입)
   * 그 밖의 키: 도구가 채팅에 내보내는 문구
   * 스코프는 common -> app -> screen 순으로 찾는다.
   */
  actionTools: 'action-tools',
} as const
