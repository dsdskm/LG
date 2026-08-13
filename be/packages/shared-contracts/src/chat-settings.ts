export type ChatSettingValueItem = {
  key: string;
  value: unknown;
};

export type ChatSettingUpdateRequest = {
  llmProvider?: string;
  settings?: ChatSettingValueItem[];
};

export type ChatGuidanceUpdateRequest = {
  examples?: unknown;
};

export type ChatPromptUpsertRequest = {
  appKey?: string | null;
  screenKey: string;
  type?: string | null;
  prompt?: string | null;
  enabled?: boolean;
};

export type ChatGuidanceCreateRequest = {
  appKey?: string | null;
  screenKey: string;
};
