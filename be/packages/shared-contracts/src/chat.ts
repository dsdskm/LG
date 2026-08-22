export interface ChatPayload {
  message: string;
  currentPath?: string;
  currentApp?: string;
  key: string;
  author?: string;
  groupId?: string;
  siteId?: string;
  history?: ChatTurn[];
  context?: Record<string, unknown>;
}

export interface ChatTurn {
  role: 'user' | 'assistant';
  content: string;
}
