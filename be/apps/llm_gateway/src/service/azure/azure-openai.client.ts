/**
 * Azure OpenAI API 클라이언트
 * - HTTP 호출, 응답 파싱, 로깅 담당
 */

import { logOpenAIUsage } from "./azure-openai.usage";

export interface AzureOpenaiClientLogger {
  log: (msg: string) => void;
  debug: (msg: string) => void;
  error: (msg: string) => void;
}

export interface AzureOpenaiGenerateRequest {
  endpoint: string;
  apiKey: string;
  apiVersion: string;
  deployment: string;
  messages: Array<{ role: string; content: string }>;
  maxCompletionTokens: number;
}

export interface AzureOpenaiGenerateResult {
  ok: boolean;
  status: number;
  text?: string;
  elapsedMs: number;
  url?: string;
  raw?: any;
  responseHeaders?: Record<string, string>;
}

export class AzureOpenaiClient {
  constructor(private readonly logger: AzureOpenaiClientLogger) { }

  async generateContent(
    req: AzureOpenaiGenerateRequest,
  ): Promise<AzureOpenaiGenerateResult> {
    const startTime = Date.now();
    const { endpoint, apiKey, apiVersion, deployment, messages, maxCompletionTokens } = req;

    // URL 구성
    const url = `${endpoint.replace(/\/$/, '')}/openai/deployments/${deployment}/chat/completions?api-version=${apiVersion}`;

    this.logger.log(
      `[AzureOpenai] generateContent url=${url} messageCount=${messages.length}`,
    );

    // 요청 본문
    const body = JSON.stringify({
      messages,
      max_completion_tokens: maxCompletionTokens,
    });

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

      // 응답 파싱
      let responseText = '';
      try {
        responseText = await response.text();
        logOpenAIUsage("gpt-5", response)
      } catch {
        this.logger.error(`azure open ai call failed`)
      }

      const responseHeaders: Record<string, string> = {};
      response.headers.forEach((value, key) => {
        responseHeaders[key] = value;
      });

      if (!response.ok) {
        let raw: any;
        try {
          raw = JSON.parse(responseText);
        } catch {
          raw = responseText;
        }

        this.logger.error(
          `[AzureOpenai] generateContent failed status=${response.status} elapsedMs=${elapsedMs}`,
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
          `[AzureOpenai] failed to parse response: ${e?.message}`,
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
      const text =
        jsonData?.choices?.[0]?.message?.content ?? '';

      this.logger.log(
        `[AzureOpenai] generateContent success elapsedMs=${elapsedMs}`,
      );

      return {
        ok: true,
        status: 200,
        text,
        elapsedMs,
        url,
        raw: jsonData,
        responseHeaders,
      };
    } catch (e: any) {
      const elapsedMs = Date.now() - startTime;
      this.logger.error(
        `[AzureOpenai] generateContent error elapsedMs=${elapsedMs} message=${e?.message}`,
      );

      return {
        ok: false,
        status: 500,
        elapsedMs,
        url,
        raw: { error: e?.message },
      };
    }
  }
}
