// apps/event_analyzer/src/llm/api.ts
import { Injectable, Logger } from "@nestjs/common";
import { ApiClient } from "@ai-log/http-api";
import type { LlmPayload } from "@ai-log/shared-contracts";

export type LlmGatewayResponse = {
    status: number;
    data: unknown;
    text: string;
};

@Injectable()
export class LlmGatewayApi {
    private readonly logger = new Logger(LlmGatewayApi.name);
    private readonly baseUrl = process.env.RUN_IN_DOCKER === 'true'
        ? (process.env.URL_LLM_GATEWAY_CONTAINER ?? "http://llm_gateway_service:3003")
        : (process.env.URL_LLM_GATEWAY ?? "http://localhost:3003");
    private readonly timeoutMs = Number(process.env.SERVER_TIMEOUT ?? 500_000);

    constructor(private readonly api: ApiClient) { }

    /**
     * llm_gateway로 로그 분석 요청
     * - 성공: HTTP status 반환
     * - 실패: ApiClient가 ApiError throw
     */
    async postLogs(payload: LlmPayload): Promise<LlmGatewayResponse> {
        const url = `${this.baseUrl}/llm/analyze/logs`;
        const r = await this.api.requestJson<LlmGatewayResponse>("POST", url, payload, { timeoutMs: this.timeoutMs });
        return { status: r.status, data: r.data, text: r.text };
    }
}