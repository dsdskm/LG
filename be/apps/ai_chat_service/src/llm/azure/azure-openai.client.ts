/**
 * Azure OpenAI API 클라이언트
 * - HTTP 호출, 응답 파싱, 로깅 담당
 */

import { Logger } from "@nestjs/common";
import { logOpenAIUsage } from "./azure-openai.usage";

export interface AzureOpenaiClientLogger {
  log: (msg: string) => void;
  debug: (msg: string) => void;
  error: (msg: string) => void;
}

/** OpenAI chat message. tool 호출 루프를 위해 assistant.tool_calls / role:'tool' 도 허용. */
export interface AzureChatMessage {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string | null;
  name?: string;
  tool_call_id?: string;
  tool_calls?: AzureToolCall[];
}

/** OpenAI function tool 선언 래퍼. */
export interface AzureTool {
  type: 'function';
  function: {
    name: string;
    description?: string;
    parameters?: Record<string, any>;
  };
}

export interface AzureToolCall {
  id: string;
  type: 'function';
  function: { name: string; arguments: string };
}

export interface AzureOpenaiGenerateRequest {
  endpoint: string;
  apiKey: string;
  apiVersion: string;
  deployment: string;
  messages: Array<AzureChatMessage | { role: string; content: string }>;
  maxCompletionTokens: number;
  tools?: AzureTool[];
  toolChoice?: 'auto' | 'none' | 'required';
}

export interface AzureOpenaiGenerateResult {
  ok: boolean;
  status: number;
  text?: string;
  toolCalls?: AzureToolCall[];
  finishReason?: string;
  elapsedMs: number;
  url?: string;
  raw?: any;
  responseHeaders?: Record<string, string>;
}

function safeJsonParse(text: string): any {
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

function stringifyForLog(value: any): string {
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
}

function pickUsefulAzureHeaders(headers: Record<string, string>): Record<string, string> {
  const usefulHeaderKeys = [
    'apim-request-id',
    'x-ms-request-id',
    'x-request-id',
    'request-id',
    'traceparent',
    'x-ms-region',
    'x-ms-client-request-id',
    'x-ms-error-code',
    'retry-after',
    'content-type',
    'date',
  ];

  const picked: Record<string, string> = {};

  for (const key of usefulHeaderKeys) {
    const value = headers[key];
    if (value !== undefined) {
      picked[key] = value;
    }
  }

  return picked;
}

function buildMessageSummary(
  messages: Array<AzureChatMessage | { role: string; content: string }>,
): Array<{ index: number; role: string; contentLength: number; hasToolCalls?: boolean; toolCallCount?: number }> {
  return messages.map((message: any, index) => ({
    index,
    role: message?.role ?? 'unknown',
    contentLength: typeof message?.content === 'string' ? message.content.length : 0,
    hasToolCalls: Array.isArray(message?.tool_calls),
    toolCallCount: Array.isArray(message?.tool_calls) ? message.tool_calls.length : 0,
  }));
}

export class AzureOpenaiClient {
  private readonly logger = new Logger(AzureOpenaiClient.name)
  constructor() { }

  async generateContent(
    req: AzureOpenaiGenerateRequest,
  ): Promise<AzureOpenaiGenerateResult> {
    const startTime = Date.now();
    const {
      endpoint,
      apiKey,
      apiVersion,
      deployment,
      messages,
      maxCompletionTokens,
      tools,
      toolChoice,
    } = req;

    // URL 구성
    const url = `${endpoint.replace(/\/$/, '')}/openai/deployments/${deployment}/chat/completions?api-version=${apiVersion}`;

    // 요청 본문
    const body = JSON.stringify({
      messages,
      max_completion_tokens: maxCompletionTokens,
      ...(tools && tools.length ? { tools, tool_choice: toolChoice ?? 'auto' } : {}),
    });
    this.logger.log(`[generateContent] request messages=${JSON.stringify(messages)}`);

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'api-key': apiKey,
        },
        body,
      });

      const elapsedMs = Date.now() - startTime;

      const responseHeaders: Record<string, string> = {};
      response.headers.forEach((value, key) => {
        responseHeaders[key.toLowerCase()] = value;
      });

      const usefulHeaders = pickUsefulAzureHeaders(responseHeaders);

      // 응답 body는 성공/실패 모두 먼저 확보
      let responseText = '';
      try {
        responseText = await response.text();
      } catch (e: any) {
        this.logger.error(
          `[generateContent] failed to read response body status=${response.status} statusText=${response.statusText} elapsedMs=${elapsedMs} error=${e?.message}`,
        );
      }

      try {
        logOpenAIUsage("gpt-5", response);
      } catch (e: any) {
        this.logger.error(
          `[generateContent] logOpenAIUsage failed status=${response.status} elapsedMs=${elapsedMs} error=${e?.message}`,
        );
      }

      if (!response.ok) {
        const raw = safeJsonParse(responseText);

        const azureError = typeof raw === 'object' && raw !== null ? raw.error : undefined;

        const errorLogPayload = {
          ok: false,
          status: response.status,
          statusText: response.statusText,
          elapsedMs,
          url,
          endpoint: endpoint.replace(/\/$/, ''),
          deployment,
          apiVersion,
          maxCompletionTokens,
          messageCount: messages.length,
          toolCount: tools?.length ?? 0,
          toolChoice: tools && tools.length ? toolChoice ?? 'auto' : undefined,
          headers: usefulHeaders,
          azureErrorCode: azureError?.code,
          azureErrorMessage: azureError?.message,
          azureErrorParam: azureError?.param,
          azureErrorType: azureError?.type,
          azureInnerError: azureError?.innererror ?? azureError?.innerError,
          raw,
        };

        this.logger.error(
          `[AzureOpenai] generateContent failed ${stringifyForLog(errorLogPayload)}`,
        );

        return {
          ok: false,
          status: response.status,
          elapsedMs,
          url,
          raw,
          responseHeaders,
        };
      }

      // 성공 응답 파싱
      let jsonData: any;
      try {
        jsonData = JSON.parse(responseText);
      } catch (e: any) {
        this.logger.error(
          `[AzureOpenai] failed to parse response status=${response.status} statusText=${response.statusText} elapsedMs=${elapsedMs} url=${url} error=${e?.message} raw=${responseText}`,
        );

        return {
          ok: false,
          status: 500,
          elapsedMs,
          url,
          raw: responseText,
          responseHeaders,
        };
      }

      // 메시지 추출
      const choice = jsonData?.choices?.[0];
      const text = choice?.message?.content ?? '';
      const toolCalls: AzureToolCall[] | undefined = choice?.message?.tool_calls;

      this.logger.debug(
        `[AzureOpenai] generateContent success elapsedMs=${elapsedMs} status=${response.status} finish=${choice?.finish_reason} toolCalls=${toolCalls?.length ?? 0} headers=${stringifyForLog(usefulHeaders)}`,
      );

      return {
        ok: true,
        status: response.status,
        text,
        toolCalls,
        finishReason: choice?.finish_reason,
        elapsedMs,
        url,
        raw: jsonData,
        responseHeaders,
      };
    } catch (e: any) {
      const elapsedMs = Date.now() - startTime;

      // fetch 실패의 실제 원인은 e.cause 에 담긴다(네트워크 계층 에러).
      // 예) ETIMEDOUT(연결 타임아웃), ENOTFOUND(DNS), ECONNREFUSED, CERT_* 등
      const cause = e?.cause;
      const causeCode = cause?.code ?? cause?.errno;
      const target = `${cause?.address ?? ''}${cause?.port ? ':' + cause.port : ''}`;

      const errorLogPayload = {
        ok: false,
        status: 500,
        elapsedMs,
        url,
        endpoint: endpoint.replace(/\/$/, ''),
        deployment,
        apiVersion,
        message: e?.message,
        name: e?.name,
        stack: e?.stack,
        causeCode: causeCode ?? 'n/a',
        causeName: cause?.name ?? 'n/a',
        causeMessage: cause?.message ?? 'n/a',
        syscall: cause?.syscall ?? 'n/a',
        target: target || 'n/a',
      };

      this.logger.error(
        `[AzureOpenai] generateContent network/error ${stringifyForLog(errorLogPayload)}`,
      );

      return {
        ok: false,
        status: 500,
        elapsedMs,
        url,
        raw: {
          error: e?.message,
          name: e?.name,
          causeCode,
          target,
          causeMessage: cause?.message,
          stack: e?.stack,
        },
      };
    }
  }
}