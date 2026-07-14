import { Injectable } from "@nestjs/common";

import { open } from "node:fs/promises";
import { loadDecompressHandlers } from "@mcap/support";
import { FileHandleReadable } from "@mcap/nodejs";
import { McapIndexedReader } from "@mcap/core";

import type { ErrorLogBundle, LogLevel, ParsedLogLine } from "@ai-log/shared-contracts";

@Injectable()
export class McapParser {

    async parseMcapAndBuildErrorWindows(
        filePath: string,
        ctxN: number
    ): Promise<{
        robotId: string;
        totalMessages: number;
        errorCount: number;
        errorLogBundle: ErrorLogBundle[];
        fullLog: ParsedLogLine[];
    }> {
        const decompressHandlers = await loadDecompressHandlers();
        const fh = await open(filePath, "r");

        try {
            const reader = await McapIndexedReader.Initialize({
                readable: new FileHandleReadable(fh),
                decompressHandlers,
            });

            const td = new TextDecoder();

            const lines: ParsedLogLine[] = [];
            const errorIndices: number[] = [];
            let robotId = "UNKNOWN";

            let i = 0;

            for await (const message of reader.readMessages()) {
                let line: ParsedLogLine;

                try {
                    const raw = td.decode(message.data);
                    const obj = JSON.parse(raw);

                    const level = normalizeLogLevel(obj?.level);
                    const msg = String(obj?.message ?? "");
                    if (robotId === "UNKNOWN") {
                        const rawRobotId = obj?.robotId;
                        if (typeof rawRobotId === "string" && rawRobotId.trim()) {
                            robotId = rawRobotId.trim();
                        }
                    }

                    line = {
                        index: i,
                        level,
                        message: msg,
                    };
                } catch {
                    line = {
                        index: i,
                        level: "UNKNOWN",
                        message: "(unparsed message)",
                    };
                }

                lines.push(line);

                if (line.level === "ERROR") {
                    errorIndices.push(i);
                }

                i++;
            }

            // 첫 ERROR 라인 하나만 "직전 ctxN(error_context_lines) 라인 ~ 에러 라인"으로 묶어
            // 단일 번들(Error Context 1개, 에러 1개)로 만든다. 에러 이후 라인은 포함하지 않는다.
            // (로그 총량은 event_generator 가 10~100줄로 보내므로 에러 앞 컨텍스트가 충분하다.)
            let errorLogBundle: ErrorLogBundle[] = [];
            if (errorIndices.length > 0) {
                const eIdx = errorIndices[0];
                const start = Math.max(0, eIdx - ctxN);
                errorLogBundle = [
                    {
                        errorIndex: eIdx,
                        context: lines.slice(start, eIdx + 1),
                    },
                ];
            }

            return {
                robotId,
                totalMessages: lines.length,
                errorCount: errorIndices.length,
                errorLogBundle,
                fullLog: lines,
            };
        } finally {
            await fh.close().catch(() => { });
        }
    }
}

function normalizeLogLevel(raw: unknown): LogLevel {
    const s = String(raw ?? "").trim();
    const upper = s.toUpperCase();

    if (upper === "DEBUG") return "DEBUG";
    if (upper === "INFO") return "INFO";
    if (upper === "WARN" || upper === "WARNING") return "WARN";
    if (upper === "ERROR" || upper === "ERR") return "ERROR";

    if (upper === "VERBOSE") return "DEBUG";
    if (upper === "LOG") return "INFO";

    if (upper === "FATAL" || upper === "CRITICAL") return "ERROR";

    return "UNKNOWN";
}