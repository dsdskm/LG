import type { ErrorLogBundle } from "./log";

export type AnalyzerPayload = {
    // event_receiver -> event_analyzer
    id: number;
    eventId: number;
    errorLogBundle: ErrorLogBundle[];
    summary?: string;
    reason?: string;
    updatedAt: Date;
    createdAt: Date;
};

export type AnalyzerSummaryResponse = {
    summary?: string;
    reason?: string;
};