import Link from 'next/link';
import type { EventItem, ReportItem, AnalyzerSummaryResponse, SolutionFetchResponse } from '@ai-log/shared-contracts';
import { STATUS_LABEL_MAP, STATUS_COLOR_MAP } from './constants';

type EventDetailContentProps = {
  event: EventItem;
  report: ReportItem | null;
  analysisResult: AnalyzerSummaryResponse | null;
  solutionResult: SolutionFetchResponse | null;
};

export function EventDetailContent({
  event,
  report,
  analysisResult,
  solutionResult,
}: EventDetailContentProps) {
  const statusKey = String(event.status)
    .trim()
    .replace(/\s+/g, '_')
    .replace(/-/g, '_')
    .toLowerCase();
  const statusLabel = STATUS_LABEL_MAP[statusKey] ?? statusKey.toUpperCase();
  const statusClasses = STATUS_COLOR_MAP[statusKey] ?? STATUS_COLOR_MAP.unknown;
  const isSpinning = [
    'analyzing',
    'solution_generating',
    'report_generating',
  ].includes(statusKey);

  const summaryText = analysisResult?.summary?.trim() || '요약 데이터가 없습니다.';
  const reasonText = analysisResult?.reason?.trim() || '원인 데이터가 없습니다.';
  const solutions = Array.isArray(solutionResult?.solutions)
    ? solutionResult.solutions.filter((value) => Boolean(String(value).trim()))
    : [];

  return (
    <div className="min-h-screen bg-zinc-50 px-6 py-10 dark:bg-slate-950">
      <div className="mx-auto max-w-6xl space-y-8">
        <div className="rounded-[2rem] border border-zinc-200 bg-white/90 p-8 shadow-sm shadow-zinc-200/40 dark:border-zinc-800 dark:bg-slate-900/90">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-zinc-500 dark:text-zinc-400">
                이벤트 상세
              </p>
              <h1 className="mt-3 text-4xl font-semibold tracking-tight text-zinc-950 dark:text-zinc-50">
                Event #{event.id}
              </h1>
            </div>
            <span
              className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold ${statusClasses}`}
            >
              {isSpinning ? (
                <span className="h-3.5 w-3.5 border-2 border-current border-t-transparent rounded-full animate-spin" />
              ) : (
                <span className="h-3.5 w-3.5 border-2 border-current rounded-full text-[10px] flex items-center justify-center">✓</span>
              )}
              {statusLabel}
            </span>
          </div>
          <div className="mt-8 grid gap-4 sm:grid-cols-3">
            <div className="rounded-3xl bg-zinc-50 p-5 dark:bg-slate-950">
              <p className="text-sm font-semibold text-zinc-500 dark:text-zinc-400">
                생성 시간
              </p>
              <p className="mt-2 text-lg text-zinc-900 dark:text-zinc-100">
                {new Date(event.createdAt).toLocaleString('ko-KR')}
              </p>
            </div>
            <div className="rounded-3xl bg-zinc-50 p-5 dark:bg-slate-950">
              <p className="text-sm font-semibold text-zinc-500 dark:text-zinc-400">
                업데이트
              </p>
              <p className="mt-2 text-lg text-zinc-900 dark:text-zinc-100">
                {new Date(event.updatedAt).toLocaleString('ko-KR')}
              </p>
            </div>
            <div className="rounded-3xl bg-zinc-50 p-5 dark:bg-slate-950">
              <p className="text-sm font-semibold text-zinc-500 dark:text-zinc-400">
                이벤트 ID
              </p>
              <p className="mt-2 text-lg text-zinc-900 dark:text-zinc-100">
                {event.id}
              </p>
            </div>
          </div>
        </div>

        <div className="rounded-[2rem] border border-zinc-200 bg-white/90 p-8 shadow-sm shadow-zinc-200/40 dark:border-zinc-800 dark:bg-slate-900/90">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-zinc-500 dark:text-zinc-400">
            이슈 리포트
          </p>

          <div className="mt-6 space-y-4">
            <div className="rounded-3xl bg-zinc-50 p-6 dark:bg-slate-950">
              <p className="text-sm font-semibold text-zinc-500 dark:text-zinc-400">
                요약
              </p>
              <p className="mt-3 rounded-3xl bg-white p-5 text-sm leading-7 text-zinc-800 dark:bg-slate-900 dark:text-zinc-100">
                {summaryText}
              </p>
            </div>

            <div className="rounded-3xl bg-zinc-50 p-6 dark:bg-slate-950">
              <p className="text-sm font-semibold text-zinc-500 dark:text-zinc-400">
                원인
              </p>
              <p className="mt-3 rounded-3xl bg-white p-5 text-sm leading-7 text-zinc-800 dark:bg-slate-900 dark:text-zinc-100">
                {reasonText}
              </p>
            </div>

            <div className="rounded-3xl bg-zinc-50 p-6 dark:bg-slate-950">
              <p className="text-sm font-semibold text-zinc-500 dark:text-zinc-400">
                해결 방안
              </p>
              {solutions.length > 0 ? (
                <ul className="mt-3 space-y-2 rounded-3xl bg-white p-5 text-sm leading-7 text-zinc-800 dark:bg-slate-900 dark:text-zinc-100">
                  {solutions.map((solution, index) => (
                    <li key={`${event.id}-solution-${index}`} className="flex gap-2">
                      <span className="text-zinc-500 dark:text-zinc-400">{index + 1}.</span>
                      <span>{solution}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mt-3 rounded-3xl bg-white p-5 text-sm leading-7 text-zinc-800 dark:bg-slate-900 dark:text-zinc-100">
                  솔루션 데이터가 없습니다.
                </p>
              )}
            </div>
          </div>

          {report ? (
            <div className="mt-6 space-y-4">
              <div className="rounded-3xl bg-zinc-50 p-6 dark:bg-slate-950">
                <p className="text-sm font-semibold text-zinc-500 dark:text-zinc-400">
                  리포트 내용
                </p>
                <pre className="mt-3 whitespace-pre-wrap rounded-3xl bg-white p-5 text-sm leading-7 text-zinc-800 dark:bg-slate-900 dark:text-zinc-100">
                  {report.report}
                </pre>
              </div>
            </div>
          ) : (
            <div className="mt-6 rounded-3xl bg-zinc-50 p-6 text-sm text-zinc-500 dark:bg-slate-950 dark:text-zinc-400">
              해당 이벤트에 연결된 리포트가 없습니다.
            </div>
          )}
          {Array.isArray(event.errorLogBundle) && event.errorLogBundle.length > 0 ? (
            <div className="mt-6 rounded-3xl bg-zinc-50 p-6 dark:bg-slate-950">
              <p className="text-sm font-semibold text-zinc-500 dark:text-zinc-400">
                Error Log Bundle
              </p>
              <pre className="mt-3 whitespace-pre-wrap rounded-3xl bg-white p-5 text-sm leading-7 text-zinc-800 dark:bg-slate-900 dark:text-zinc-100">
                {JSON.stringify(event.errorLogBundle, null, 2)}
              </pre>
            </div>
          ) : null}
          <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-zinc-500 dark:text-zinc-400">
              내용을 확인하셨다면 버튼을 눌러 목록으로 돌아가세요.
            </p>
            <Link
              href="/"
              className="inline-flex items-center justify-center rounded-full bg-sky-600 px-6 py-3 text-sm font-semibold text-white transition hover:bg-sky-700"
            >
              확인
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
