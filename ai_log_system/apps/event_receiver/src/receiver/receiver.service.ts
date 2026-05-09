// apps/event_receiver/src/receiver.service.ts
import { Injectable, Logger } from "@nestjs/common";

import { writeFile, rm } from "node:fs/promises";
import * as os from "node:os";
import * as path from "node:path";

import { McapParser } from "src/utils/mcap.parser";

import { EventStatus, type AnalyzerPayload, type ErrorLogBundle, type EventItem, type EventPayload } from "@ai-log/shared-contracts";
import { ApiError } from "@ai-log/http-api";
import { AnalyzerApi } from "src/api/analyzer.api";
import { DbService } from "src/db/db.service";

@Injectable()
export class ReceiverService {
    private readonly logger = new Logger(ReceiverService.name);
    private readonly CTX_N = Number(process.env.ERROR_CONTEXT_LINES ?? 5);

    constructor(
        private readonly parser: McapParser,
        private readonly analyzerApi: AnalyzerApi,
        private readonly receiverDb: DbService, // ✅ TypeORM DB 서비스
    ) { }

    async handleMcapBuffer(buffer: Buffer): Promise<number> {
        const startedAt = Date.now();
        const bytes = buffer?.length ?? 0;

        // ✅ 0) DB placeholder 생성 → id는 DB가 자동 생성
        const row = await this.receiverDb.createPlaceholder(EventStatus.RECEIVED);
        const id = row.id;

        this.logger.log(`[${id}] ingest/mcap received bytes=${bytes}`);

        // 1) tmp 파일 저장 (id 기반 파일명)
        const filePath = path.join(os.tmpdir(), `${id}.mcap`);
        await writeFile(filePath, buffer);

        try {
            // 2) MCAP 파싱 → errorLogBundle 생성
            const parsedRaw = await this.parser.parseMcapAndBuildErrorWindows(filePath, this.CTX_N);
            const parsed = normalizeParsedResult(parsedRaw);

            this.logger.log(
                `[${id}] parsed totalMessages=${parsed.totalMessages} errorCount=${parsed.errorCount} bundles=${parsed.errorLogBundle.length}`,
            );

            // ✅ 3) DB 업데이트 (파싱 결과 반영)
            if (parsed.errorLogBundle.length === 0) {
                await this.receiverDb.updateStatus({
                    id,
                    status: "NO_ERROR",
                });

                const elapsedMs = Date.now() - startedAt;
                this.logger.log(`[${id}] no ERROR -> 204 elapsedMs=${elapsedMs}`);
                return 204;
            }

            await this.receiverDb.updateErrorBundle({
                id,
                errorLogBundle: parsed.errorLogBundle,
            });
            await this.receiverDb.updateStatus({
                id,
                status: EventStatus.PREPARED,
            });



            // 4) Analyzer로 보낼 payload 구성 (✅ id는 DB에서 받은 id 사용)
            const now = new Date();
            const payload: AnalyzerPayload = {
                id, // ✅ 직접 생성 X (DB 생성값)
                eventId: id,
                errorLogBundle: parsed.errorLogBundle,
                createdAt: row.createdAt ?? now,
                updatedAt: now,
            };

            // ✅ 5) Analyzer로 전달 fire-and-forget
            void this.analyzerApi
                .postEvent(payload)
                .then((status) => {
                    this.logger.log(`[${id}] analyzer accepted status=${status} bundles=${parsed.errorLogBundle.length}`);
                })
                .catch((e: any) => {
                    if (e instanceof ApiError) {
                        this.logger.error(
                            `[${id}] analyzer call failed (async) status=${e.status} err=${e.message} bodyPreview=${e.bodyPreview ?? "-"}`,
                        );
                        return;
                    }
                    this.logger.error(`[${id}] analyzer call failed (async) err=${e?.message ?? String(e)}`);
                });

            return 202;
        } catch (e: any) {
            const elapsedMs = Date.now() - startedAt;

            await this.receiverDb.updateStatus({ id, status: "FAILED" }).catch(() => { });

            this.logger.error(`[${id}] ingest failed -> 500 elapsedMs=${elapsedMs} err=${e?.message ?? String(e)}`);
            this.logger.debug(e?.stack ?? "");
            return 500;
        } finally {
            await rm(filePath, { force: true }).catch(() => { });
        }
    }

    // ============================
    // ✅ 추가: Controller에서 호출할 DB 업데이트 API
    // ============================

    /** event status 업데이트 */
    async updateEventStatus(id: number, status: string): Promise<void> {
        await this.receiverDb.updateStatus({ id, status });
    }

    /** event.analysisIds 업데이트 */
    async updateEventAnalysisIds(id: number, analysisIds: number[]): Promise<void> {
        await this.receiverDb.updateIds({ id, analysisIds });
    }

    /** event.solutionIds 업데이트 */
    async updateEventSolutionIds(id: number, solutionIds: number[]): Promise<void> {
        await this.receiverDb.updateIds({ id, solutionIds });
    }

    /** all events 조회 */
    async fetchEvents(): Promise<EventItem[]> {
        const raw = await this.receiverDb.findAllEvents();
        return raw.map((event) => ({
            id: event.id,
            status: event.status,
            errorLogBundle: event.errorLogBundle ?? [],
            analysisIds: event.analysisIds ?? [],
            solutionIds: event.solutionIds ?? [],
            createdAt: event.createdAt.toISOString(),
            updatedAt: event.updatedAt.toISOString(),
        }));
    }

    async fetchEventById(id: number): Promise<EventItem | null> {
        const event = await this.receiverDb.findEventById(id);
        if (!event) return null;
        return {
            id: event.id,
            status: event.status,
            errorLogBundle: event.errorLogBundle ?? [],
            analysisIds: event.analysisIds ?? [],
            solutionIds: event.solutionIds ?? [],
            createdAt: event.createdAt.toISOString(),
            updatedAt: event.updatedAt.toISOString(),
        };
    }
}

function normalizeParsedResult(input: any): {
    totalMessages: number;
    errorCount: number;
    errorLogBundle: ErrorLogBundle[];
} {
    const totalMessages = Number(input?.totalMessages ?? 0);
    const errorCount = Number(input?.errorCount ?? 0);

    if (Array.isArray(input?.errorLogBundle)) {
        return {
            totalMessages,
            errorCount,
            errorLogBundle: input.errorLogBundle as ErrorLogBundle[],
        };
    }

    if (Array.isArray(input?.errorWindows)) {
        return {
            totalMessages,
            errorCount,
            errorLogBundle: input.errorWindows as ErrorLogBundle[],
        };
    }

    return { totalMessages, errorCount, errorLogBundle: [] };
}