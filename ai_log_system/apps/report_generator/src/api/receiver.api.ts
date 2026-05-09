import { Injectable } from '@nestjs/common';
import { ApiClient } from '@ai-log/http-api';

@Injectable()
export class ReceiverApi {
  private readonly baseUrl = process.env.RUN_IN_DOCKER === 'true'
    ? (process.env.URL_EVENT_RECEIVER_CONTAINER ?? 'http://event_receiver_service:3001')
    : (process.env.URL_EVENT_RECEIVER ?? 'http://localhost:3001');

  private readonly timeoutMs = Number(
    process.env.SERVER_TIMEOUT ?? 500_000,
  );

  constructor(private readonly api: ApiClient) { }

  /**
   * event_receiver로 status 업데이트
   * PATCH /events/:id/status
   */
  async patchEventStatus(
    id: number,
    status: string,
  ): Promise<number> {
    const url = `${this.baseUrl}/events/${encodeURIComponent(
      String(id),
    )}/status`;

    const res = await this.api.requestJson(
      'PATCH',
      url,
      { status },
      { timeoutMs: this.timeoutMs },
    );

    return res.status;
  }
}
``