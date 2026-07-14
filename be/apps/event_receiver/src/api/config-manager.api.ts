import { Injectable, Logger } from "@nestjs/common";
import { ApiClient } from "@ai-log/http-api";

type ApiResponse<T> = {
  code: number;
  data: T;
};

type ErrorContextLinesMeta = {
  errorContextLines: number;
  updatedBy: string | null;
  updatedAt: string | Date | null;
};

@Injectable()
export class ConfigManagerApi {
  private readonly logger = new Logger(ConfigManagerApi.name);
  private readonly baseUrl = process.env.URL_CONFIG_MANAGER ?? "http://localhost:3008";
  private readonly timeoutMs = Number(process.env.SERVER_TIMEOUT ?? 500_000);

  constructor(private readonly api: ApiClient) {}

  async getErrorContextLines(): Promise<number> {
    const url = `${this.baseUrl.replace(/\/+$/, "")}/config/event/error-context-lines`;
    const res = await this.api.requestJson<ApiResponse<ErrorContextLinesMeta>>(
      "GET",
      url,
      undefined,
      { timeoutMs: this.timeoutMs },
    );

    const n = Number(res.data?.data?.errorContextLines);
    if (!Number.isFinite(n)) {
      this.logger.warn(`invalid errorContextLines from config_manager, fallback used url=${url}`);
      return Number(process.env.ERROR_CONTEXT_LINES ?? 5);
    }

    return n;
  }
}