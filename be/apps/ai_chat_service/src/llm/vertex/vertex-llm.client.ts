/**
 * Google Vertex(Gemini) provider 어댑터.
 *
 * 공통 LlmClient(OpenAI 포맷) ↔ Gemini generateContent 포맷을 양방향 변환한다.
 *  - messages     → systemInstruction + contents(role user/model)
 *  - tools        → tools[].functionDeclarations
 *  - toolChoice   → toolConfig.functionCallingConfig.mode
 *  - assistant.tool_calls → parts[].functionCall
 *  - role:'tool'          → parts[].functionResponse (tool_call_id 로 함수명 역참조)
 *  - 응답 parts[].functionCall → LlmToolCall
 *
 * 인증은 ADC(GOOGLE_APPLICATION_CREDENTIALS). Azure 와 동일한 tool-calling 루프를 지원한다.
 */
import { GoogleAuth } from 'google-auth-library';
import type { VertexGeminiConfig } from './vertex-gemini.config';
import type { VertexGenerateContentResponse } from './vertex-types';
import {
  fetchWithTimeout,
  pickHeaders,
  safeJsonParse,
  truncate,
} from '../../utils/utils';
import type {
  LlmClient,
  LlmGenerateRequest,
  LlmGenerateResult,
  LlmMessage,
  LlmTool,
  LlmToolCall,
  LlmToolChoice,
} from '../llm.types';
import { Logger } from '@nestjs/common';

type GeminiPart =
  | { text: string }
  | { functionCall: { name: string; args: Record<string, any> } }
  | { functionResponse: { name: string; response: Record<string, any> } };

type GeminiContent = { role: 'user' | 'model'; parts: GeminiPart[] };

export class VertexLlmClient implements LlmClient {
  private readonly logger = new Logger(VertexLlmClient.name)
  private readonly auth: GoogleAuth;

  constructor(
    private readonly cfg: VertexGeminiConfig,
  ) {
    this.auth = new GoogleAuth({ scopes: [cfg.googleAuthScope] });
  }

  async generateContent(req: LlmGenerateRequest): Promise<LlmGenerateResult> {
    const startedAt = Date.now();
    const url = this.buildUrl();

    const accessToken = await this.getAccessToken();
    if (!accessToken) {
      return {
        ok: false,
        status: 0,
        elapsedMs: Date.now() - startedAt,
        url,
        raw: { error: 'Failed to acquire access token (ADC)' },
      };
    }

    const { systemInstruction, contents } = this.toGeminiContents(req.messages);

    const body: Record<string, any> = {
      contents,
      generationConfig: {
        temperature: this.cfg.defaultTemperature,
        maxOutputTokens: req.maxOutputTokens,
      },
    };
    if (systemInstruction) {
      body.systemInstruction = { parts: [{ text: systemInstruction }] };
    }
    if (req.tools && req.tools.length) {
      body.tools = [{ functionDeclarations: req.tools.map(toGeminiDeclaration) }];
      body.toolConfig = {
        functionCallingConfig: { mode: toGeminiMode(req.toolChoice) },
      };
    }

    try {
      const res = await fetchWithTimeout(
        url,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${accessToken}`,
          },
          body: JSON.stringify(body),
        },
        this.cfg.timeoutMs,
      );

      const elapsedMs = Date.now() - startedAt;
      const responseHeaders = pickHeaders(res.headers, [
        'content-type',
        'x-goog-request-id',
        'server',
        'date',
      ]);

      const rawText = await res.text().catch(() => '');
      const json = safeJsonParse(rawText) as VertexGenerateContentResponse | null;

      if (!res.ok) {
        this.logger.error(
          `[Vertex] generateContent failed status=${res.status} elapsedMs=${elapsedMs} body=${truncate(
            rawText,
            2000,
          )}`,
        );
        return {
          ok: false,
          status: res.status,
          elapsedMs,
          url,
          raw: json ?? rawText,
          responseHeaders,
        };
      }

      const candidate = json?.candidates?.[0];
      const parts = candidate?.content?.parts ?? [];
      const text = parts
        .map((p: any) => p?.text)
        .filter(Boolean)
        .join('\n');
      const toolCalls = extractToolCalls(parts);

      this.logger.debug(
        `[Vertex] generateContent success elapsedMs=${elapsedMs} finish=${candidate?.finishReason} toolCalls=${
          toolCalls?.length ?? 0
        }`,
      );

      return {
        ok: true,
        status: res.status,
        text,
        toolCalls,
        finishReason: candidate?.finishReason,
        elapsedMs,
        url,
        raw: json ?? rawText,
        responseHeaders,
      };
    } catch (e: any) {
      const elapsedMs = Date.now() - startedAt;
      const errMsg =
        e?.name === 'AbortError'
          ? `Vertex request timed out (${this.cfg.timeoutMs}ms)`
          : e?.message ?? 'fetch failed';
      this.logger.error(`[Vertex] generateContent error elapsedMs=${elapsedMs} err=${errMsg}`);
      return { ok: false, status: 0, elapsedMs, url, raw: { error: errMsg } };
    }
  }

  private buildUrl() {
    const { defaultLocation: location, projectId, defaultModelId } = this.cfg;
    const host =
      location === 'global'
        ? 'aiplatform.googleapis.com'
        : `${location}-aiplatform.googleapis.com`;
    const modelResource = `projects/${projectId}/locations/${location}/publishers/google/models/${defaultModelId}`;
    return `https://${host}/v1/${modelResource}:generateContent`;
  }

  private async getAccessToken(): Promise<string | null> {
    try {
      const client = await this.auth.getClient();
      const token = await client.getAccessToken();
      const accessToken = typeof token === 'string' ? token : token?.token;
      return accessToken ?? null;
    } catch (e: any) {
      this.logger.error(`[Vertex] ADC token error: ${e?.message ?? String(e)}`);
      return null;
    }
  }

  /** OpenAI 메시지 배열 → Gemini systemInstruction + contents. */
  private toGeminiContents(messages: LlmMessage[]): {
    systemInstruction?: string;
    contents: GeminiContent[];
  } {
    // tool_call_id → 함수명 역참조 맵(role:'tool' 응답의 functionResponse.name 복원용)
    const callIdToName = new Map<string, string>();
    for (const m of messages) {
      for (const tc of m.tool_calls ?? []) {
        callIdToName.set(tc.id, tc.function.name);
      }
    }

    const systemTexts: string[] = [];
    const contents: GeminiContent[] = [];

    const pushMerged = (role: 'user' | 'model', parts: GeminiPart[]) => {
      const last = contents[contents.length - 1];
      // 연속된 tool 응답 등 동일 role 은 하나의 content 로 병합(Gemini role 교대 요구 대응).
      if (last && last.role === role) last.parts.push(...parts);
      else contents.push({ role, parts });
    };

    for (const m of messages) {
      switch (m.role) {
        case 'system':
          if (m.content) systemTexts.push(m.content);
          break;
        case 'user':
          pushMerged('user', [{ text: m.content ?? '' }]);
          break;
        case 'assistant': {
          const parts: GeminiPart[] = [];
          if (m.content) parts.push({ text: m.content });
          for (const tc of m.tool_calls ?? []) {
            parts.push({
              functionCall: {
                name: tc.function.name,
                args: (safeJsonParse(tc.function.arguments) ?? {}) as Record<string, any>,
              },
            });
          }
          if (parts.length) pushMerged('model', parts);
          break;
        }
        case 'tool': {
          const name = m.tool_call_id ? callIdToName.get(m.tool_call_id) : undefined;
          const parsed = safeJsonParse(m.content ?? '');
          const response =
            parsed && typeof parsed === 'object'
              ? (parsed as Record<string, any>)
              : { result: m.content ?? '' };
          pushMerged('user', [
            { functionResponse: { name: name ?? 'unknown', response } },
          ]);
          break;
        }
      }
    }

    return {
      systemInstruction: systemTexts.length ? systemTexts.join('\n\n') : undefined,
      contents,
    };
  }
}

function toGeminiDeclaration(tool: LlmTool) {
  return {
    name: tool.function.name,
    description: tool.function.description,
    parameters: tool.function.parameters ?? { type: 'object', properties: {} },
  };
}

function toGeminiMode(choice?: LlmToolChoice): 'AUTO' | 'NONE' | 'ANY' {
  switch (choice) {
    case 'none':
      return 'NONE';
    case 'required':
      return 'ANY';
    case 'auto':
    default:
      return 'AUTO';
  }
}

/** Gemini 응답 parts 의 functionCall → OpenAI 포맷 LlmToolCall. */
function extractToolCalls(parts: any[]): LlmToolCall[] | undefined {
  const calls: LlmToolCall[] = [];
  parts.forEach((p, i) => {
    const fc = p?.functionCall;
    if (fc?.name) {
      calls.push({
        id: `call_${i}_${fc.name}`,
        type: 'function',
        function: { name: fc.name, arguments: JSON.stringify(fc.args ?? {}) },
      });
    }
  });
  return calls.length ? calls : undefined;
}
