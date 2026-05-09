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
        totalMessages: number;
        errorCount: number;
        errorLogBundle: ErrorLogBundle[];
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

            let i = 0;

            for await (const message of reader.readMessages()) {
                let line: ParsedLogLine;

                try {
                    const raw = td.decode(message.data);
                    const obj = JSON.parse(raw);

                    const level = normalizeLogLevel(obj?.level);
                    const msg = String(obj?.message ?? "");

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

            const bundles: ErrorLogBundle[] = errorIndices.map((eIdx) => {
                const start = Math.max(0, eIdx - ctxN);
                const end = Math.min(lines.length - 1, eIdx + ctxN);
                return {
                    errorIndex: eIdx,
                    context: lines.slice(start, end + 1),
                };
            });

            const MAX_BUNDLES = Number(process.env.MAX_ERROR_WINDOWS ?? 50);
            const limited = bundles.length > MAX_BUNDLES ? bundles.slice(0, MAX_BUNDLES) : bundles;

            return {
                totalMessages: lines.length,
                errorCount: errorIndices.length,
                errorLogBundle: limited,
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