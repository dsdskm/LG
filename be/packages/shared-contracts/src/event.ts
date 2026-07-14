import type { ErrorLogBundle, ParsedLogLine } from "./log";

export enum EventStatus {
    RECEIVED = "received",
    PREPARED = "prepared",
    PREPARE_FAILED = "prepare_failed",
    ANALYZING = "analyzing",
    ANALYZED = "analyzed",
    ANALYZE_FAILED = "analyze_failed",
    COMPLETED = "completed",
    FAILED = "failed",
}

export type EventPayload = {
    // event_receiver
    id: number;
    eventId: number;
    robotId: string;
    status: string;
    errorLogBundle: ErrorLogBundle[];
    // 넘어온 최초 원문 로그 전체 (LLM 분석 범위는 errorLogBundle 인덱스로 표시)
    fullLog?: ParsedLogLine[];
    updatedAt: string;
    createdAt: string;
};