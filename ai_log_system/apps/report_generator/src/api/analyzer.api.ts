import { Injectable } from '@nestjs/common';
import { ApiClient } from '@ai-log/http-api';
import type { AnalyzerSummaryResponse } from '@ai-log/shared-contracts';

@Injectable()
export class AnalyzerApi {
  private readonly baseUrl = process.env.RUN_IN_DOCKER === 'true'
    ? (process.env.URL_EVENT_ANALYZER_CONTAINER ?? 'http://event_analyzer_service:3002')
    : (process.env.URL_EVENT_ANALYZER ?? 'http://localhost:3002');
  private readonly timeoutMs = Number(process.env.SERVER_TIMEOUT ?? 500_000);

  constructor(private readonly api: ApiClient) {}

  async getAnalysisSummary(eventId: number): Promise<AnalyzerSummaryResponse> {
    const url = `${this.baseUrl}/analysis/${encodeURIComponent(String(eventId))}`;
    const response = await this.api.requestJson<AnalyzerSummaryResponse>('GET', url, undefined, {
      timeoutMs: this.timeoutMs,
    });
    return response.data ?? { summary: undefined, reason: undefined };
  }
}
