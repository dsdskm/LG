import { Injectable } from "@nestjs/common";
import { ApiClient } from "@ai-log/http-api";
import { toKoreanTimeString } from "@ai-log/shared-contracts";
import type { LlmGatewayResponse } from "./llm.api";

export type SolutionCreateRequest = {
    eventId: number;
    llmResult: LlmGatewayResponse;
};

export type SolutionCreateResponse = {
    solutionIds: number[];
    createdAt: string;
};

@Injectable()
export class SolutionApi {
    private readonly baseUrl = process.env.RUN_IN_DOCKER === 'true'
        ? (process.env.URL_SOLUTION_GENERATOR_CONTAINER ?? "http://solution_generator_service:3004")
        : (process.env.URL_SOLUTION_GENERATOR ?? "http://localhost:3004");
    private readonly timeoutMs = Number(process.env.SERVER_TIMEOUT ?? 500_000);

    constructor(private readonly api: ApiClient) { }

    async createSolution(payload: SolutionCreateRequest): Promise<SolutionCreateResponse> {
        const url = `${this.baseUrl}/solutions`;
        const r = await this.api.requestJson<SolutionCreateResponse>("POST", url, payload, {
            timeoutMs: this.timeoutMs,
        });
        console.log(`createSolution ${JSON.stringify(r)}`)

        return r.data ?? { solutionIds: [], createdAt: toKoreanTimeString() };
    }
}
