/**
 * Azure OpenAI provider 어댑터.
 * 공통 LlmClient 인터페이스를 구현하고, 내부적으로 기존 AzureOpenaiClient(HTTP 호출)에 위임한다.
 * endpoint/apiKey/deployment 등 provider 세부 설정은 config 에서 주입받아 캡슐화한다.
 */
import { AzureOpenaiClient } from './azure-openai.client';
import type { AzureOpenaiConfig } from './azure-openai.config';
import type {
  LlmClient,
  LlmGenerateRequest,
  LlmGenerateResult,
  LlmLogger,
} from '../llm.types';

export class AzureLlmClient implements LlmClient {
  private readonly inner: AzureOpenaiClient;

  constructor(
    private readonly cfg: AzureOpenaiConfig,
  ) {
    this.inner = new AzureOpenaiClient();
  }

  async generateContent(req: LlmGenerateRequest): Promise<LlmGenerateResult> {
    // 공통 메시지/툴 스키마가 OpenAI 포맷과 동일하므로 그대로 전달.
    const res = await this.inner.generateContent({
      endpoint: this.cfg.endpoint,
      apiKey: this.cfg.apiKey,
      apiVersion: this.cfg.apiVersion,
      deployment: this.cfg.deployment,
      messages: req.messages,
      maxCompletionTokens: req.maxOutputTokens,
      tools: req.tools,
      toolChoice: req.toolChoice,
    });

    return {
      ok: res.ok,
      status: res.status,
      text: res.text,
      toolCalls: res.toolCalls,
      finishReason: res.finishReason,
      elapsedMs: res.elapsedMs,
      url: res.url,
      raw: res.raw,
      responseHeaders: res.responseHeaders,
    };
  }
}
