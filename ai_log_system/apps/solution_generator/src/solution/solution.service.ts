import { Injectable, Logger } from "@nestjs/common";
import { DbService } from "../db/db.service";
import { ReceiverApi } from "../api/receiver.api";
import { ReportApi } from "../api/report.api";
import { EventStatus, toKoreanTimeString } from "@ai-log/shared-contracts";
import type { ReportCreateRequest } from "@ai-log/shared-contracts";

export type SolutionCreateRequest = {
    eventId: number;
    llmResult: unknown;
};

export type SolutionCreateResponse = {
    solutionIds: number[];
    createdAt: string;
};

@Injectable()
export class SolutionService {
    private readonly logger = new Logger(SolutionService.name);

    constructor(
        private readonly db: DbService,
        private readonly receiverApi: ReceiverApi,
        private readonly reportApi: ReportApi,
    ) { }

    async generateSolution(payload: SolutionCreateRequest): Promise<SolutionCreateResponse> {
        const solutions = this.extractSolutions(payload.llmResult);
        const entity = await this.db.saveSolution(payload.eventId, solutions);

        await this.receiverApi.patchEventSolutionIds(payload.eventId, [entity.id]);
        await this.receiverApi.patchEventStatus(payload.eventId, EventStatus.SOLUTION_CREATED);

        const reportRequest: ReportCreateRequest = { eventId: payload.eventId };
        await this.reportApi.createReport(reportRequest).catch((e) => {
            this.logger.error(`report_generator call failed eventId=${payload.eventId} err=${e?.message ?? String(e)}`);
            return null;
        });

        this.logger.log(`generateSolution eventId=${payload.eventId} solutionId=${entity.id}`);

        return {
            solutionIds: [entity.id],
            createdAt: toKoreanTimeString(entity.createdAt),
        };
    }

    async fetchSolutions(eventId: number): Promise<string[]> {
        const solution = await this.db.findByEventId(eventId);
        return solution?.solutions ?? [];
    }

    private extractSolutions(llmResult: unknown): string[] {
        const fromLlMResult = this.extractField(llmResult, "solutions");
        if (Array.isArray(fromLlMResult)) return fromLlMResult.map(String);

        const data = this.extractField(llmResult, "data");
        const fromData = this.extractField(data, "solutions");
        if (Array.isArray(fromData)) return fromData.map(String);

        const fromDataText = this.extractTextFieldAndParse(data, "solutions");
        if (Array.isArray(fromDataText)) return fromDataText.map(String);

        const fromText = this.extractTextFieldAndParse(llmResult, "solutions");
        if (Array.isArray(fromText)) return fromText.map(String);

        return [];
    }

    private extractField(data: unknown, field: string): unknown {
        if (!data || typeof data !== "object") return null;
        return (data as Record<string, unknown>)[field] ?? null;
    }

    private extractTextFieldAndParse(data: unknown, field: string): unknown {
        if (!data || typeof data !== "object") return null;
        const text = (data as Record<string, unknown>)["text"];
        if (typeof text !== "string" || !text.trim()) return null;

        const parsed = this.parseJson(text);
        if (!parsed) return null;
        return this.extractField(parsed, field);
    }

    private parseJson(value: string): Record<string, unknown> | null {
        try {
            return JSON.parse(value) as Record<string, unknown>;
        } catch {
            return null;
        }
    }
}
