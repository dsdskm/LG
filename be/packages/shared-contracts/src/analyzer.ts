import type { ErrorLogBundle } from "./log";
import type { SuggestedAction } from "./action";

export type AnalyzerPayload = {
    // event_receiver -> event_analyzer
    id: number;
    eventId: number;
    errorLogBundle: ErrorLogBundle[];
    summary?: string;
    reason?: string;
    solutions?: string;
    solution?: string;
    func?: string;
    severity?: string;
    service?: string;
    confidence?: number; // Stage1 분류 정확도 0.00~1.00
    actions?: SuggestedAction[]; // 후속 액션 제안 (분류된 func 후보 중 LLM이 선택)
    updatedAt: Date;
    createdAt: Date;
};