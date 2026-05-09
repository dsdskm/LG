// apps/event_receiver/src/analyzer/api.ts
import { Injectable } from "@nestjs/common";
import { ApiClient } from "@ai-log/http-api";
import type { AnalyzerPayload } from "@ai-log/shared-contracts";

@Injectable()
export class AnalyzerApi {
    private readonly analyzerUrl = process.env.RUN_IN_DOCKER === 'true'
        ? (process.env.URL_EVENT_ANALYZER_CONTAINER ?? "http://event_analyzer_service:3002")
        : (process.env.URL_EVENT_ANALYZER ?? "http://localhost:3002");
    private readonly timeoutMs = Number(process.env.SERVER_TIMEOUT ?? 500_000);

    constructor(private readonly api: ApiClient) { }

    /**
     * event_analyzer로 이벤트 전달
     * - 성공: HTTP status 반환
     * - 실패: ApiClient가 ApiError throw
     */
    async postEvent(payload: AnalyzerPayload): Promise<number> {
        const url = `${this.analyzerUrl}/event`; // <- analyzer controller 라우트에 맞춰
        const r = await this.api.requestJson("POST", url, payload, { timeoutMs: this.timeoutMs });
        return r.status;
    }
}