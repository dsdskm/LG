import { Injectable } from "@nestjs/common";
import type { ReportCreateRequest, ReportCreateResponse } from "@ai-log/shared-contracts";

@Injectable()
export class ReportApi {
    private readonly baseUrl = process.env.RUN_IN_DOCKER === 'true'
        ? (process.env.URL_REPORT_GENERATOR_CONTAINER ?? "http://report_generator_service:3005")
        : (process.env.URL_REPORT_GENERATOR ?? "http://localhost:3005");
    private readonly timeoutMs = Number(process.env.SERVER_TIMEOUT ?? 500_000);

    async createReport(payload: ReportCreateRequest): Promise<ReportCreateResponse> {
        const url = `${this.baseUrl}/reports`;
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), this.timeoutMs);

        try {
            const res = await fetch(url, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
                signal: controller.signal,
            });

            const text = await res.text().catch(() => "");
            if (!res.ok) {
                throw new Error(`HTTP ${res.status} ${url} ${text.slice(0, 1000)}`);
            }

            return JSON.parse(text) as ReportCreateResponse;
        } finally {
            clearTimeout(timeout);
        }
    }
}
