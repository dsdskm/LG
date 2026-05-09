import EventTableClient from "./components/event-table";
import type { AnalyzerSummaryResponse } from "@ai-log/shared-contracts";
import type { EventItem } from "@ai-log/shared-contracts";
import type { ReportItem } from "@ai-log/shared-contracts";
import type { SolutionFetchResponse } from "@ai-log/shared-contracts";

type EventRow = EventItem & {
  summary: string;
};

import { getAnalysisSummary, getEvents, getReports, getSolutions } from "./lib/api";

type DashboardData = {
  reports: ReportItem[];
  eventItems: EventItem[];
  eventRows: EventRow[];
  reportCount: number;
  eventCount: number;
  todayIssueCount: number;
  oneDayAverage: number;
  statusCounts: Record<string, number>;
  latestEventId: number | null;
  issueCards: Array<{ reportId: number; eventId: number; createdAt: string; issue: string; report: string }>;
  latestAnalysis: AnalyzerSummaryResponse;
  latestSolutions: string[];
};

function buildIssueCard(report: ReportItem) {
  const lines = report.report.split(/\r?\n/).map((line: string) => line.trim()).filter(Boolean);
  const issue = lines.find((line: string) => line.startsWith("*요약")) ?? lines[0] ?? report.report;
  return {
    reportId: report.reportId,
    eventId: report.eventId,
    createdAt: report.createdAt,
    issue,
    report: report.report,
  };
}

async function getDashboardData(): Promise<DashboardData> {
  const reportItems = (await getReports()) ?? [];
  const eventItems = (await getEvents()) ?? [];
  console.log(`eventItems`, eventItems)
  const reportCount = reportItems.length;
  const eventCount = eventItems.length;
  const issueCards = reportItems.slice(0, 5).map(buildIssueCard);
  const latestEventId = reportItems[0]?.eventId ?? eventItems[0]?.id ?? null;
  const issueSummaryMap = new Map<number, string>();
  reportItems.forEach((report) => {
    issueSummaryMap.set(report.eventId, buildIssueCard(report).issue);
  });

  const analyzerSummaryEntries = await Promise.all(
    eventItems.map(async (event) => {
      const summaryResponse = await getAnalysisSummary(event.id);
      return [event.id, summaryResponse?.summary?.trim() ?? ""] as const;
    }),
  );

  const analyzerSummaryMap = new Map<number, string>(
    analyzerSummaryEntries.filter(([, summary]) => Boolean(summary)),
  );

  const eventRows: EventRow[] = eventItems.map((event) => ({
    ...event,
    summary:
      analyzerSummaryMap.get(event.id) ?? issueSummaryMap.get(event.id) ?? "분석중",
  }));

  const todayKey = new Date().toLocaleDateString("ko-KR");
  const todayIssueCount = eventRows.filter(
    (event) => new Date(event.createdAt).toLocaleDateString("ko-KR") === todayKey,
  ).length;

  const statusCounts = eventItems.reduce((acc, event) => {
    const key = event.status ?? "unknown";
    acc[key] = (acc[key] ?? 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const sortedDates = Array.from(
    new Set(
      eventRows
        .map((event) => new Date(event.createdAt).toLocaleDateString("ko-KR"))
        .sort(),
    ),
  );
  const daysCount = Math.max(1, sortedDates.length);
  const oneDayAverage = Number((eventCount / daysCount).toFixed(1));

  const latestAnalysis = (latestEventId
    ? await getAnalysisSummary(latestEventId)
    : null) ?? { summary: "데이터를 불러올 수 없습니다.", reason: "서비스가 실행 중인지 확인하세요." };

  const latestSolutions = (latestEventId
    ? await getSolutions(latestEventId)
    : null)?.solutions ?? [];

  return {
    reports: reportItems,
    eventItems,
    eventRows,
    reportCount,
    eventCount,
    todayIssueCount,
    statusCounts,
    latestEventId,
    issueCards,
    latestAnalysis,
    latestSolutions,
    oneDayAverage,
  };
}

export default async function Home() {
  const data = await getDashboardData();

  return (
    <div className="min-h-screen bg-zinc-50 text-zinc-950 dark:bg-slate-950 dark:text-zinc-100">
      <div className="flex w-full flex-col gap-6 px-3 py-6 lg:px-4">
        <header className="grid gap-6 rounded-[2rem] border border-zinc-200 bg-white/90 p-8 shadow-sm shadow-zinc-200/40 backdrop-blur dark:border-zinc-800 dark:bg-slate-900/90 dark:shadow-black/10 lg:grid-cols-[1.5fr_0.8fr]">
          <div className="space-y-4">
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-sky-600 dark:text-sky-300">
              AI Log Dashboard
            </p>
            <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">
              실시간 이슈 현황
            </h1>
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="rounded-3xl border border-zinc-200 bg-slate-50 p-6 dark:border-zinc-800 dark:bg-slate-950">
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-zinc-500 dark:text-zinc-400">
                전체 이슈
              </p>
              <p className="mt-4 text-4xl font-semibold text-sky-700 dark:text-sky-300">
                {data.eventCount}
              </p>
            </div>
            <div className="rounded-3xl border border-zinc-200 bg-slate-50 p-6 dark:border-zinc-800 dark:bg-slate-950">
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-zinc-500 dark:text-zinc-400">
                오늘 이슈
              </p>
              <p className="mt-4 text-4xl font-semibold text-sky-700 dark:text-sky-300">
                {data.todayIssueCount}
              </p>
            </div>
            <div className="rounded-3xl border border-zinc-200 bg-slate-50 p-6 dark:border-zinc-800 dark:bg-slate-950">
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-zinc-500 dark:text-zinc-400 whitespace-nowrap">
                1일 평균 이슈
              </p>
              <p className="mt-4 text-4xl font-semibold text-sky-700 dark:text-sky-300">
                {data.oneDayAverage}
              </p>
            </div>
          </div>
        </header>

        <section>
          <EventTableClient eventRows={data.eventRows} pageSize={10} />
        </section>
      </div>
    </div>
  );
}
