import { Injectable, Logger } from "@nestjs/common";
import { ApiClient } from "@ai-log/http-api";

@Injectable()
export class ReceiverApi {
  private readonly logger = new Logger(ReceiverApi.name);
  private readonly baseUrl =
    process.env.URL_EVENT_RECEIVER ?? "http://localhost:3001";
  private readonly timeoutMs = Number(process.env.SERVER_TIMEOUT ?? 500_000);

  constructor(private readonly api: ApiClient) {}

  /**
   * event_receiver로 이벤트 상태 갱신
   * PATCH /events/:id/status  body: { status }
   * - status 는 저장 규칙에 맞춰 대문자로 전송한다(예: COMPLETED).
   */
  async patchEventStatus(eventId: number, status: string): Promise<number> {
    const normalized = String(status ?? "").trim().toUpperCase();
    const url = `${this.baseUrl}/events/${encodeURIComponent(String(eventId))}/status`;
    const r = await this.api.requestJson(
      "PATCH",
      url,
      { status: normalized },
      { timeoutMs: this.timeoutMs },
    );
    this.logger.log(
      `patchEventStatus eventId=${eventId} status=${normalized} -> ${r.status}`,
    );
    return r.status;
  }
}
