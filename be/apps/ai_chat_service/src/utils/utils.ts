export async function fetchWithTimeout(
  url: string,
  init: RequestInit,
  timeoutMs: number,
): Promise<Response> {
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(t);
  }
}

export function pickHeaders(headers: Headers, keys: string[]) {
  const out: Record<string, string> = {};
  for (const k of keys) {
    const v = headers.get(k);
    if (v) out[k] = v;
  }
  return out;
}

export function safeJsonParse(text: string) {
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

export function truncate(s: string, max: number) {
  if (!s) return '';
  return s.length > max ? s.slice(0, max) + ` ... (truncated ${s.length - max})` : s;
}

export const sleep = (ms: number) =>
  new Promise((resolve) => setTimeout(resolve, ms));

export function logLlmPromptMeta(payload: {
  stage: string
  promptType: string
  route?: string | null
  appKey?: string | null
  systemPromptLen?: number
  messageLen?: number
  historyTurns?: number
  toolCount?: number
  isToolCall?: boolean
  reqId?: string | null
}) {
  const details = {
    stage: payload.stage,
    promptType: payload.promptType,
    route: payload.route ?? null,
    appKey: payload.appKey ?? null,
    reqId: payload.reqId ?? null,
    systemPromptLen: Number(payload.systemPromptLen ?? 0),
    messageLen: Number(payload.messageLen ?? 0),
    historyTurns: Number(payload.historyTurns ?? 0),
    toolCount: Number(payload.toolCount ?? 0),
    isToolCall: Boolean(payload.isToolCall),
  }

  console.info('[LLM_PROMPT_META]', details)
}