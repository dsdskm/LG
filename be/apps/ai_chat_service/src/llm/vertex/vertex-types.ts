export type VertexGenerateContentBody = {
  contents: Array<{
    role: 'user' | 'model' | string;
    parts: Array<{ text: string }>;
  }>;
  generationConfig?: {
    temperature?: number;
    maxOutputTokens?: number;
  };
};

export type VertexContentPart = {
  text?: string;
};

export type VertexContent = {
  role?: string;
  parts?: VertexContentPart[];
};

export type VertexCandidate = {
  content?: VertexContent;
  finishReason?: string;
  avgLogprobs?: number;
};

export type VertexGenerateContentResponse = {
  candidates?: VertexCandidate[];
  usageMetadata?: any;
  modelVersion?: string;
  createTime?: string;
  responseId?: string;
  [k: string]: any;
};

export type VertexCallParams = {
  projectId: string;
  location: string;
  modelId: string;
  requestId: string;
  prompt: string;
  temperature: number;
  maxOutputTokens: number;
  timeoutMs: number;
};

export type VertexCallResult = {
  ok: boolean;
  status: number;
  elapsedMs: number;
  url: string;
  responseHeaders: Record<string, string>;
  text: string;
  raw: any;
};
