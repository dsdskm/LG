import { Body, Controller, Post, Res } from "@nestjs/common";
import type { Response } from "express";
import { GeneratorService } from "./generator.service";

export type SendBody = {
    durationMinutes?: number;
    logsPerSecond?: number;
    errorTemplates?: string[] | string;
    errorCount?: number;
    receiverUrl?: string;
};

@Controller()
export class GeneratorController {
    constructor(private readonly svc: GeneratorService) { }

    @Post("send")
    async send(@Body() body: SendBody, @Res() res: Response) {
        const result = await this.svc.handleSend(body);

        // 응답 메타 헤더는 여기서만 세팅(프레젠테이션 레이어)
        res.setHeader("Content-Type", "application/octet-stream");
        res.setHeader("x-batch-id", result.meta.batchId);
        res.setHeader("x-log-count", String(result.meta.logCount));
        res.setHeader("x-receiver-status", String(result.meta.receiverStatus));

        if (result.meta.receiverJson !== undefined) {
            try {
                res.setHeader("x-receiver-json", encodeURIComponent(JSON.stringify(result.meta.receiverJson)));
            } catch {
                // ignore
            }
        }

        return res.status(200).send(result.buffer);
    }
}