/**
 * LLM provider 공통 추상화.
 *
 * Azure OpenAI / Google Vertex(Gemini) 등 provider 를 갈아끼울 수 있도록
 * 파이프라인(인텐트 분류·RAG·tool agent)이 의존하는 최소 인터페이스를 정의한다.
 * 메시지/툴 스키마는 OpenAI(chat completions) 형태를 정본으로 삼고,
 * 각 provider 어댑터가 자신의 API 포맷으로 변환한다.
 */

export type LlmRole = 'system' | 'user' | 'assistant' | 'tool';

/** 대화 메시지. tool 호출 루프를 위해 assistant.tool_calls / role:'tool' 도 허용. */
export interface LlmMessage {
  role: LlmRole;
  content: string | null;
  name?: string;
  tool_call_id?: string;
  tool_calls?: LlmToolCall[];
}

/** function tool 선언(OpenAI function 포맷). */
export interface LlmTool {
  type: 'function';
  function: {
    name: string;
    description?: string;
    parameters?: Record<string, any>;
  };
}

export interface LlmToolCall {
  id: string;
  type: 'function';
  function: { name: string; arguments: string };
}

export type LlmToolChoice = 'auto' | 'none' | 'required';

export interface LlmGenerateRequest {
  messages: LlmMessage[];
  maxOutputTokens: number;
  tools?: LlmTool[];
  toolChoice?: LlmToolChoice;
}

export interface LlmGenerateResult {
  ok: boolean;
  status: number;
  text?: string;
  toolCalls?: LlmToolCall[];
  finishReason?: string;
  elapsedMs: number;
  url?: string;
  raw?: any;
  responseHeaders?: Record<string, string>;
}

export interface LlmClient {
  generateContent(req: LlmGenerateRequest): Promise<LlmGenerateResult>;
}

export interface LlmLogger {
  log: (msg: string) => void;
  debug: (msg: string) => void;
  error: (msg: string) => void;
}

export type LlmProvider = 'azure' | 'vertex';


export interface LlmRuntime {
  provider: LlmProvider;
  client: LlmClient;
  maxOutputTokens: number;
  assertConfig: () => void;
}
