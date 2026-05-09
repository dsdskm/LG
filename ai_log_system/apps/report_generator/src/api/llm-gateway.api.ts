import { Injectable } from '@nestjs/common';
import { ApiClient } from '@ai-log/http-api';
import type { ReportSummaryRequest } from '@ai-log/shared-contracts';

@Injectable()
export class LlmGatewayApi {
  private readonly baseUrl = process.env.RUN_IN_DOCKER === 'true'
    ? (process.env.URL_LLM_GATEWAY_CONTAINER ?? 'http://llm_gateway_service:3003')
    : (process.env.URL_LLM_GATEWAY ?? 'http://localhost:3003');
  private readonly timeoutMs = Number(process.env.SERVER_TIMEOUT ?? 500_000);

  constructor(private readonly api: ApiClient) {}

  async summarizeReport(payload: ReportSummaryRequest): Promise<string> {
    const url = `${this.baseUrl}/llm/summarize/report`;
    const response = await this.api.requestJson<{ text?: string }>(
      'POST',
      url,
      payload,
      { timeoutMs: this.timeoutMs },
    );

    const text = response.data?.text ?? response.text ?? '';
    return String(text).trim();
  }
}
