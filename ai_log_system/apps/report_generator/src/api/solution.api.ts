import { Injectable } from '@nestjs/common';
import { ApiClient } from '@ai-log/http-api';
import type { SolutionFetchResponse } from '@ai-log/shared-contracts';

@Injectable()
export class SolutionApi {
  private readonly baseUrl = process.env.RUN_IN_DOCKER === 'true'
    ? (process.env.URL_SOLUTION_GENERATOR_CONTAINER ?? 'http://solution_generator_service:3004')
    : (process.env.URL_SOLUTION_GENERATOR ?? 'http://localhost:3004');
  private readonly timeoutMs = Number(process.env.SERVER_TIMEOUT ?? 500_000);

  constructor(private readonly api: ApiClient) {}

  async getSolutions(eventId: number): Promise<SolutionFetchResponse> {
    const url = `${this.baseUrl}/solutions/${encodeURIComponent(String(eventId))}`;
    const response = await this.api.requestJson<SolutionFetchResponse>('GET', url, undefined, {
      timeoutMs: this.timeoutMs,
    });
    return response.data ?? { solutions: [] };
  }
}
