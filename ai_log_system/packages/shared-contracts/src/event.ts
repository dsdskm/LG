import type { ErrorLogBundle } from "./log";

export enum EventStatus {
    RECEIVED = "received",
    PREPARED = "prepared",
    PREPARE_FAILED = "prepare_failed",
    ANALYZING = "analyzing",
    ANALYZED = "analyzed",
    ANALYZE_FAILED = "analyze_failed",
    SOLUTION_GENERATING = "solution_generating",
    SOLUTION_CREATED = "solution_created",
    SOLUTION_FAILED = "solution_failed",
    REPORT_GENERATING= "report_generating",
    REPORT_CREATED = "report_created",
    REPORT_FAILED = "report_failed",
    COMPLETED = "completed",
    FAILED = "failed",
}

export type EventPayload = {
    // event_receiver
    id: number;
    status: string;
    errorLogBundle: ErrorLogBundle[];
    analysisIds: number[];
    solutionIds: number[];
    updatedAt: Date;
    createdAt: Date;
};

export type EventItem = {
    id: number;
    status: EventStatus | string;
    errorLogBundle: ErrorLogBundle[];
    analysisIds: number[];
    solutionIds: number[];
    createdAt: string;
    updatedAt: string;
};