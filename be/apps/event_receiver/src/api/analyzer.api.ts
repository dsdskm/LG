// apps/event_receiver/src/analyzer/api.ts
import { Injectable } from "@nestjs/common";
import { ApiClient } from "@ai-log/http-api";
import type { AnalyzerPayload } from "@ai-log/shared-contracts";

type AnalyzerMockSeed = {
    eventId: number;
    createdAt?: string;
};

type AnalyzerMockIngestResponse = {
    requested: number;
    accepted: number;
    queued: number;
    eventIds: number[];
};

@Injectable()
export class AnalyzerApi {
    private readonly analyzerUrl = process.env.URL_EVENT_ANALYZER ?? "http://localhost:3002";
    private readonly timeoutMs = Number(process.env.SERVER_TIMEOUT ?? 500_000);

    constructor(private readonly api: ApiClient) { }

    /**
     * event_analyzer로 이벤트 전달
     * - 성공: HTTP status 반환
     * - 실패: ApiClient가 ApiError throw
     */
    async postEvent(payload: AnalyzerPayload): Promise<number> {
        const url = `${this.analyzerUrl}/analysis/event-forward`; // <- analyzer controller 라우트에 맞춰
        const r = await this.api.requestJson("POST", url, payload, { timeoutMs: this.timeoutMs });
        return r.status;
    }

    async postMockEvents(
        events: AnalyzerMockSeed[],
    ): Promise<{ status: number; data: AnalyzerMockIngestResponse | null }> {
        const url = `${this.analyzerUrl}/test/mock-events`;
        const r = await this.api.requestJson<AnalyzerMockIngestResponse>(
            "POST",
            url,
            { events },
            { timeoutMs: this.timeoutMs },
        );
        return { status: r.status, data: r.data };
    }
}