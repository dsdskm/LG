export interface ChatPayload {
  message: string;
  currentPath?: string;
  currentApp?: string;
  key: string;
  author?: string;
  accessToken?: string;
  apiBaseUrl?: string;
  eventAnalyzerUrl?: string;
  configManagerUrl?: string;
  history?: ChatTurn[];
  previousFilters?: Record<string, unknown>;
  context?: {
    groupId?: string;
    siteId?: string;
    [k: string]: unknown;
  };
}

export interface ChatTurn {
  role: 'user' | 'assistant';
  content: string;
}
