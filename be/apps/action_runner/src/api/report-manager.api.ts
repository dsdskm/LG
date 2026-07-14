import { Injectable, Logger } from "@nestjs/common";
import { ApiClient } from "@ai-log/http-api";

@Injectable()
export class ReportManagerApi {
  private readonly logger = new Logger(ReportManagerApi.name);
  private readonly baseUrl = process.env.URL_REPORT_MANAGER ?? "http://localhost:3005";
  private readonly timeoutMs = Number(process.env.SERVER_TIMEOUT ?? 500_000);

  constructor(private readonly api: ApiClient) {}

  async postEventId(eventId: number): Promise<number> {
    const url = `${this.baseUrl}/reports/event-forward`;
    const r = await this.api.requestJson("POST", url, { eventId }, { timeoutMs: this.timeoutMs });
    this.logger.log(`forwarded eventId=${eventId} to report_manager status=${r.status}`);
    return r.status;
  }
}
