// apps/event_analyzer/src/llm/api.ts
import { Injectable, Logger } from "@nestjs/common";
import { ApiClient } from "@ai-log/http-api";
import type { LlmPayload } from "@ai-log/shared-contracts";

export type LlmGatewayResponse = {
    status: number;
    data: unknown;
    text: string;
};

export type LlmActiveProvider = "vertex" | "azure" | "mock" | "off";

type ApiResponse<T> = {
    code: number;
    data: T;
};

type ActiveProviderPayload = {
    provider?: string;
};

@Injectable()
export class LlmGatewayApi {
    private readonly logger = new Logger(LlmGatewayApi.name);
    private readonly baseUrl = process.env.URL_LLM_GATEWAY ?? "http://localhost:3003";
    private readonly configManagerUrl = process.env.URL_CONFIG_MANAGER ?? "http://localhost:3008";
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

    /** Stage1: 로그 분류(func + confidence) 요청 */
    async classifyLogs(payload: LlmPayload): Promise<LlmGatewayResponse> {
        const url = `${this.baseUrl}/llm/classify/logs`;
        const r = await this.api.requestJson<LlmGatewayResponse>("POST", url, payload, { timeoutMs: this.timeoutMs });
        return { status: r.status, data: r.data, text: r.text };
    }

    async getActiveProvider(): Promise<LlmActiveProvider | null> {
        const url = `${this.configManagerUrl}/config/llm/active-provider`;
        this.logger.log(`Requesting active LLM provider from ${url}`);
        const r = await this.api.requestJson<ApiResponse<ActiveProviderPayload>>(
            "GET",
            url,
            undefined,
            { timeoutMs: this.timeoutMs },
        );

        const provider = String(r.data?.data?.provider ?? "").trim().toLowerCase();
        if (
            provider === "vertex" ||
            provider === "azure" ||
            provider === "mock" ||
            provider === "off"
        ) {
            return provider;
        }

        return null;
    }
}