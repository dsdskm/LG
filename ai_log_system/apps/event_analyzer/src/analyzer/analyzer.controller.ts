// apps/event_analyzer/src/analyzer/analyzer.controller.ts
import { Body, Controller, Get, Param, Post, Res, Logger } from "@nestjs/common";
import type { Response } from "express";

import type { AnalyzerPayload, AnalyzerSummaryResponse } from "@ai-log/shared-contracts";
import { AnalyzerService } from "./analyzer.service";

@Controller()
export class AnalyzerController {
    private readonly logger = new Logger(AnalyzerController.name);

    constructor(private readonly analyzer: AnalyzerService) { }

    @Post("event")
    async receive(@Body() body: AnalyzerPayload, @Res() res: Response) {
        const id = body?.id ?? "-";
        const bundles = Array.isArray((body as any)?.errorLogBundle) ? (body as any).errorLogBundle : [];

        this.logger.log(`[event_analyzer] received id=${id} bundles=${bundles.length}`);

        // 1) analyzer DB 저장(짧은 작업이라 await 유지)
        const analyzerId = await this.analyzer.saveIncomingEventSafe(body);

        // 2) 번들 없으면 끝
        if (bundles.length === 0) return res.sendStatus(204);

        // 3) 바로 202 응답(타임아웃 방지)
        res.sendStatus(202);

        // 4) 긴 작업은 서비스로 위임 (백그라운드)
        this.analyzer.runAnalyzeFlowInBackground(body, analyzerId);
    }

    @Get("analysis/:eventId")
    async getAnalysisSummary(@Param("eventId") eventId: string): Promise<AnalyzerSummaryResponse> {
        const numericEventId = Number(eventId);
        if (!Number.isInteger(numericEventId) || numericEventId <= 0) {
            return { summary: undefined, reason: undefined };
        }
        return this.analyzer.getSummaryByEventId(numericEventId);
    }
}