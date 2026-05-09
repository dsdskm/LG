import { Injectable } from "@nestjs/common";
import { open, readFile, rm } from "node:fs/promises";
import * as os from "node:os";
import * as path from "node:path";
import { FileHandleWritable } from "@mcap/nodejs";
import { McapWriter } from "@mcap/core";
import type { SendBody } from "./generator.controller";

type LogLevel = "DEBUG" | "INFO" | "WARN" | "ERROR";

type GenConfig = {
    durationMinutes: number;
    logsPerSecond: number;
    errorTemplates: string[];
    errorCount: number;
};

type SendMeta = {
    batchId: string;
    logCount: number;
    bytes: number;

    source: "event_generator";
    durationMin: number;

    receiverUrl: string;
    receiverStatus: number;
    receiverJson: any;
};

type SendResult = {
    meta: SendMeta;
    buffer: Buffer;
};

function clamp(n: number, min: number, max: number) {
    return Math.min(max, Math.max(min, n));
}
function randomPick<T>(arr: readonly T[]): T {
    return arr[(Math.random() * arr.length) | 0];
}
function shuffleInPlace<T>(a: T[]) {
    for (let i = a.length - 1; i > 0; i--) {
        const j = (Math.random() * (i + 1)) | 0;
        [a[i], a[j]] = [a[j], a[i]];
    }
}

@Injectable()
export class GeneratorService {
    private receiverUrl: string;

    private config: GenConfig = {
        durationMinutes: 1,
        logsPerSecond: 30,
        errorTemplates: ["motor overcurrent detected", "lidar timeout", "E-STOP pressed", "localization jump"],
        errorCount: 10,
    };

    constructor() {
        this.receiverUrl = process.env.RUN_IN_DOCKER === 'true'
            ? (process.env.URL_EVENT_RECEIVER_CONTAINER ?? "http://event_receiver_service:3001")
            : (process.env.URL_EVENT_RECEIVER ?? "http://localhost:3001");
    }

    /**
     * 컨트롤러는 얇게 유지하고, 모든 로직은 여기서 처리
     */
    async handleSend(body: SendBody): Promise<SendResult> {
        const startedAt = Date.now();

        // 1) 입력 정규화 + config 확정
        const normalized = this.normalizeSendBody(body);
        this.applyConfig(normalized.config, normalized.receiverUrl);

        // 2) 생성 계획 수립
        const plan = this.buildPlan();

        // 3) MCAP 생성 → Buffer 로드
        const { batchId, filePath } = this.makeBatchPath();
        const { logCount } = await this.writeMcap({
            filePath,
            startTs: plan.startTs,
            stepMs: plan.stepMs,
            total: plan.total,
            errorIndexSet: plan.errorIndexSet,
        });

        const buf = await readFile(filePath); // ✅ FileHandle GC 이슈 회피

        // 4) receiver로 업로드
        const { receiverStatus, receiverJson } = await this.forwardToReceiver({
            batchId,
            durationMin: this.config.durationMinutes,
            logCount,
            buffer: buf,
        });

        // 5) temp 파일 정리
        await rm(filePath, { force: true }).catch(() => { });

        // 6) 로그 (너가 원한 스타일)
        const bytes = buf.length;
        return {
            meta: {
                batchId,
                logCount,
                bytes,
                source: "event_generator",
                durationMin: this.config.durationMinutes,
                receiverUrl: this.receiverUrl,
                receiverStatus,
                receiverJson,
            },
            buffer: buf,
        };
    }

    /**
     * Body 정규화: errorTemplates(string|array) 처리 + 숫자 변환
     */
    private normalizeSendBody(body: SendBody): { config: Partial<GenConfig>; receiverUrl?: string } {
        const errorTemplates =
            typeof body?.errorTemplates === "string"
                ? body.errorTemplates
                    .split("\n")
                    .map((s) => s.trim())
                    .filter(Boolean)
                : Array.isArray(body?.errorTemplates)
                    ? body.errorTemplates.map((s) => String(s).trim()).filter(Boolean)
                    : undefined;

        return {
            receiverUrl: body?.receiverUrl,
            config: {
                durationMinutes: body?.durationMinutes,
                logsPerSecond: body?.logsPerSecond,
                errorCount: body?.errorCount,
                errorTemplates,
            },
        };
    }

    /**
     * Config 확정 + clamp
     */
    private applyConfig(partial: Partial<GenConfig>, receiverUrl?: string) {
        if (receiverUrl) {
            const candidate = receiverUrl.trim();
            // In container mode, loopback points to this container, not event_receiver.
            const isLoopback = /^https?:\/\/(localhost|127\.0\.0\.1|\[::1\])(?::\d+)?(?:\/|$)/i.test(candidate);
            if (!isLoopback) this.receiverUrl = candidate;
        }

        this.config = {
            durationMinutes: clamp(Number(partial.durationMinutes ?? this.config.durationMinutes), 1, 60),
            logsPerSecond: clamp(Number(partial.logsPerSecond ?? this.config.logsPerSecond), 1, 500),
            errorTemplates: (partial.errorTemplates ?? this.config.errorTemplates).filter(Boolean),
            errorCount: clamp(Number(partial.errorCount ?? this.config.errorCount), 0, 100000),
        };
    }

    /**
     * 총 로그 수 / 에러 인덱스 / 타임라인(step) 계산
     */
    private buildPlan() {
        const total = Math.floor(this.config.durationMinutes * 60 * this.config.logsPerSecond);
        const errorCount = Math.min(this.config.errorCount, total);

        const indices = Array.from({ length: total }, (_, i) => i);
        shuffleInPlace(indices);
        const errorIndexSet = new Set(indices.slice(0, errorCount));

        const endTs = Date.now();
        const startTs = endTs - this.config.durationMinutes * 60_000;
        const stepMs = total > 1 ? Math.floor((endTs - startTs) / (total - 1)) : 0;

        return { total, startTs, stepMs, errorIndexSet };
    }

    private makeBatchPath() {
        const endTs = Date.now();
        const batchId = `b_${endTs}_${String(Math.floor(Math.random() * 1e6)).padStart(6, "0")}`;
        const filePath = path.join(os.tmpdir(), `${batchId}.mcap`);
        return { batchId, filePath };
    }

    private async forwardToReceiver(args: {
        batchId: string;
        durationMin: number;
        logCount: number;
        buffer: Buffer;
    }) {
        const res = await fetch(`${this.receiverUrl}/ingest/mcap`, {
            method: "POST",
            headers: {
                "Content-Type": "application/octet-stream",
                "x-batch-id": args.batchId,
                "x-source": "event_generator",
                "x-duration-min": String(args.durationMin),
                "x-log-count": String(args.logCount),
            },
            body: new Uint8Array(args.buffer),
        });

        // receiver가 JSON을 안 줄 수도 있으니 안전하게 처리
        let receiverJson: any = {};
        try {
            receiverJson = await res.json();
        } catch {
            try {
                receiverJson = { text: await res.text() };
            } catch {
                receiverJson = {};
            }
        }

        return { receiverStatus: res.status, receiverJson };
    }

    private async writeMcap(opts: {
        filePath: string;
        startTs: number;
        stepMs: number;
        total: number;
        errorIndexSet: Set<number>;
    }) {
        const fh = await open(opts.filePath, "w");
        const writer = new McapWriter({
            writable: new FileHandleWritable(fh),
        });

        let started = false;
        let written = 0;

        try {
            await writer.start({
                profile: "custom",
                library: "event_generator_mcap",
            });
            started = true;

            const schemaId = await writer.registerSchema({
                name: "RobotLog",
                encoding: "jsonschema",
                data: new TextEncoder().encode(
                    JSON.stringify({
                        type: "object",
                        properties: {
                            robotId: { type: "string" },
                            seq: { type: "integer" },
                            ts: { type: "integer" },
                            level: { type: "string" },
                            message: { type: "string" },
                        },
                        required: ["robotId", "seq", "ts", "level", "message"],
                    })
                ),
            });

            const channelId = await writer.registerChannel({
                schemaId,
                topic: "/rosout",
                messageEncoding: "json",
                metadata: new Map([["source", "event_generator"]]),
            });

            const levels: LogLevel[] = ["DEBUG", "INFO", "WARN"];

            for (let i = 0; i < opts.total; i++) {
                const ts = opts.startTs + i * opts.stepMs;
                const isErr = opts.errorIndexSet.has(i);

                const level: LogLevel = isErr ? "ERROR" : randomPick(levels);
                const message = isErr
                    ? randomPick(this.config.errorTemplates.length ? this.config.errorTemplates : ["ERROR"])
                    : `normal log ${i}`;

                const obj = {
                    robotId: "R-001",
                    seq: i + 1,
                    ts,
                    level,
                    message,
                };

                const ns = BigInt(ts) * 1_000_000n; // ms -> ns

                await writer.addMessage({
                    channelId,
                    sequence: i + 1,
                    logTime: ns,
                    publishTime: ns,
                    data: new TextEncoder().encode(JSON.stringify(obj)),
                });

                written++;
                if (written % 500 === 0) await new Promise((r) => setTimeout(r, 0));
            }

            return { logCount: written };
        } finally {
            // Node 25+에서도 안전하게 정리
            if (started) {
                try {
                    await writer.end();
                } catch { }
            }
            try {
                await fh.close();
            } catch { }
        }
    }
}