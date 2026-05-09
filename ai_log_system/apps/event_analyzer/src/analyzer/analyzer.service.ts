// apps/event_analyzer/src/analyzer/analyzer.service.ts
import { Injectable, Logger } from "@nestjs/common";
import { EventStatus, type AnalyzerPayload } from "@ai-log/shared-contracts";

import { DbService } from "../db/db.service";
import { LlmGatewayApi } from "src/api/llm.api";
import { ReceiverApi } from "src/api/receiver.api";
import { SolutionApi } from "src/api/solution.api";
import { makeLlmAnalyzeLogsRequest } from "src/utils/llm-request.maker";

@Injectable()
export class AnalyzerService {
    private readonly logger = new Logger(AnalyzerService.name);

    constructor(
        private readonly db: DbService,
        private readonly llm: LlmGatewayApi,
        private readonly receiverApi: ReceiverApi,
        private readonly solutionApi: SolutionApi,
    ) { }

    /** ✅ 수신 payload DB 저장 (에러는 내부에서 먹고 로그만) */
    async saveIncomingEventSafe(body: AnalyzerPayload): Promise<number | null> {
        const id = body?.id ?? -1;
        try {
            return await this.db.upsertAnalyzerPayload(body);
        } catch (e: any) {
            this.logger.error(`[event_analyzer] DB save failed id=${id} err=${e?.message ?? String(e)}`);
            return null;
        }
    }

    async getSummaryByEventId(eventId: number): Promise<{ summary?: string; reason?: string }> {
        const result = await this.db.findByEventId(eventId);
        return {
            summary: result?.summary,
            reason: result?.reason,
        };
    }

    /**
     * ✅ 컨트롤러에서 202 응답 후 호출되는 백그라운드 플로우
     * - 상태: ANALYZING → ANALYZED / FAILED
     * - LLM 호출
     */
    runAnalyzeFlowInBackground(body: AnalyzerPayload, analyzerId: number | null) {
        const id = body?.id ?? -1;

        setImmediate(() => {
            void this.runAnalyzeFlow(body, analyzerId).catch((e) => {
                this.logger.error(`[event_analyzer] background fatal id=${id} err=${e?.message ?? String(e)}`);
            });
        });
    }

    private async runAnalyzeFlow(body: AnalyzerPayload, analyzerId: number | null): Promise<void> {
        const eventId = body.eventId;
        const bundles = Array.isArray(body?.errorLogBundle) ? body.errorLogBundle : [];
        if (bundles.length === 0) return;

        // 1) 상태 -> ANALYZING
        await this.patchStatusSafe(eventId, EventStatus.ANALYZING);

        try {
            // 2) LLM 호출
            const llmReq = makeLlmAnalyzeLogsRequest(body);
            const llmResult = await this.llm.postLogs(llmReq);

            this.logger.log(`runAnalyzeFlow llm done id=${eventId} llmStatus=${llmResult.status}`);
            const summary = this.extractLlmResultField(llmResult, "summary");
            const reason = this.extractLlmResultField(llmResult, "reason");
            if (analyzerId && (summary !== null || reason !== null)) {
                await this.db.updateAnalyzerResult(analyzerId, summary, reason);
                this.logger.log(`updatedAnalyzerResult`)
            }
            
            // 3) LLM 분석 결과를 받았으면 ANALYZED 상태로 업데이트
            await this.patchStatusSafe(eventId, EventStatus.ANALYZED);
            this.logger.log(`patchStatusSafe ANALYZED analyzerId ${analyzerId}`)
            // 3-1) event_receiver에 분석 ID 전달
            if (analyzerId) {
                await this.receiverApi.patchEventAnalysisIds(eventId, [analyzerId]);
                this.logger.log(`patchEventAnalysisIds`)
            }

            // 4) 분석 결과 전체를 solution_generator로 전달
            await this.solutionApi.createSolution({ eventId: eventId, llmResult });
        } catch (e: any) {
            this.logger.error(`runAnalyzeFlow failed id=${eventId} err=${e?.message ?? String(e)}`);

            // 5) 실패 상태 업데이트
            await this.patchStatusSafe(eventId, EventStatus.ANALYZE_FAILED);
        }
    }

    private async patchStatusSafe(id: number, status: EventStatus): Promise<void> {
        try {
            await this.receiverApi.patchEventStatus(id, status);
            this.logger.log(`patchStatusSafe status->${status} id=${id}`);
        } catch (e: any) {
            this.logger.error(
                `patchStatusSafe status update failed (${status}) id=${id} err=${e?.message ?? String(e)}`,
            );
        }
    }

    private extractLlmTextField(data: unknown, field: string): string | null {
        if (!data || typeof data !== "object") return null;
        const value = (data as Record<string, unknown>)[field];
        if (typeof value === "string") return value.trim() || null;
        if (value === null || value === undefined) return null;
        return String(value);
    }

    private extractLlmResultField(result: { data: unknown; text: string }, field: string): string | null {
        const fromData = this.extractLlmTextField(result.data, field);
        if (fromData) return fromData;

        const fromDataText = this.extractFieldFromNestedJsonText(result.data, field);
        if (fromDataText) return fromDataText;

        if (!result.text) return null;
        const parsedOuter = this.parseJson(result.text);
        if (!parsedOuter) return null;

        const fromOuter = this.extractLlmTextField(parsedOuter, field);
        if (fromOuter) return fromOuter;

        return this.extractFieldFromNestedJsonText(parsedOuter, field);
    }

    private extractFieldFromNestedJsonText(data: unknown, field: string): string | null {
        if (!data || typeof data !== "object") return null;
        const text = (data as Record<string, unknown>)["text"];
        if (typeof text !== "string" || !text.trim()) return null;

        const parsed = this.parseJson(text);
        if (!parsed) return null;
        return this.extractLlmTextField(parsed, field);
    }

    private parseJson(value: string): Record<string, unknown> | null {
        try {
            return JSON.parse(value) as Record<string, unknown>;
        } catch {
            return null;
        }
    }
}
