import { Injectable } from "@nestjs/common";
import { ApiClient, ApiError } from "@ai-log/http-api";
import type {
  Assignee,
  ReportConfig,
} from "@ai-log/shared-contracts";

type ApiResponse<T> = {
  code: number;
  data: T;
};

@Injectable()
export class ConfigManagerApi {
  private readonly baseUrl = process.env.URL_CONFIG_MANAGER ?? "http://localhost:3008";
  private readonly timeoutMs = Number(process.env.SERVER_TIMEOUT ?? 500_000);

  constructor(private readonly api: ApiClient) {}

  private normalizeAssignees(value: unknown): Assignee[] {
    if (!Array.isArray(value)) return [];
    return value
      .filter((item) => item && typeof item === "object")
      .map((item: any) => ({
        id: Number(item.id ?? 0),
        email: String(item.email ?? "").trim(),
        name: String(item.name ?? "").trim(),
        team: String(item.team ?? "").trim(),
        profile: String(item.profile ?? "").trim(),
        func: String(item.func ?? "").trim(),
        tags: Array.isArray(item.tags)
          ? item.tags.map((tag: unknown) => String(tag ?? "").trim()).filter(Boolean)
          : [],
        createdAt: item.createdAt,
        updatedAt: item.updatedAt,
      }))
      .filter((item) => item.email && item.name && item.team && item.func);
  }

  /** 전체 담당자 목록 조회 (func 필터링은 호출부에서). */
  async getAssignees(): Promise<Assignee[]> {
    const url = `${this.trimSlash(this.baseUrl)}/config/assignees`;
    try {
      const res = await this.api.requestJson<ApiResponse<unknown>>(
        "GET",
        url,
        undefined,
        { timeoutMs: this.timeoutMs },
      );
      return this.normalizeAssignees((res.data as any)?.data ?? res.data);
    } catch {
      return [];
    }
  }

  async getReportConfigByKey(key: string): Promise<ReportConfig | null> {
    const normalizedKey = String(key ?? "").trim();
    if (!normalizedKey) return null;

    const url = `${this.trimSlash(this.baseUrl)}/config/report-config/templates/key/${encodeURIComponent(normalizedKey)}`;

    try {
      const res = await this.api.requestJson<ApiResponse<ReportConfig>>(
        "GET",
        url,
        undefined,
        { timeoutMs: this.timeoutMs },
      );
      return (res.data?.data ?? null) as ReportConfig | null;
    } catch (error: any) {
      if (error instanceof ApiError && error.status === 404) {
        return null;
      }
      throw error;
    }
  }

  private trimSlash(value: string): string {
    return value.replace(/\/+$/, "");
  }
}
