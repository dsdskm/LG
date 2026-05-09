export type ReportCreateRequest = {
    eventId: number;
};

export type ReportCreateResponse = {
    reportId: number;
    createdAt: string;
    report: string;
};

export type ReportSummaryRequest = {
    eventId: number;
    summary: string;
    reason: string;
    solutions: string[];
};

export type ReportItem = {
    reportId: number;
    eventId: number;
    report: string;
    createdAt: string;
    updatedAt: string;
};

export type ReportListResponse = ReportItem[];

export type ReportSummaryResponse = {
    ok: boolean;
    status: number;
    text: string;
};
