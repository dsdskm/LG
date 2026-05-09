// apps/event_analyzer/src/helpers/llm-request.maker.ts
import type { AnalyzerPayload, LlmLogLine, LlmPayload } from "@ai-log/shared-contracts";

export function makeLlmAnalyzeLogsRequest(payload: AnalyzerPayload): LlmPayload {
    const bundles = Array.isArray(payload?.errorLogBundle) ? payload.errorLogBundle : [];

    const logs: LlmLogLine[] = [];

    for (const b of bundles) {
        const ctx = Array.isArray(b?.context) ? b.context : [];
        for (const line of ctx) {
            const index = Number(line?.index);
            if (!Number.isFinite(index)) continue;

            const message = String(line?.message ?? "").trim();
            if (!message) continue;

            logs.push({
                index,
                level: String(line?.level ?? "UNKNOWN"),
                message,
            });
        }
    }

    return { logs };
}