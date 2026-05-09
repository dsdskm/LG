"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { doc, onSnapshot } from "firebase/firestore";
import type { EventItem } from "@ai-log/shared-contracts";
import { firestore } from "../firebase/client";
import { getAnalysisSummary, getEvents } from "../lib/api";

const STATUS_STYLE_MAP: Record<string, string> = {
  received: "text-zinc-900 bg-zinc-100 dark:bg-zinc-800 dark:text-zinc-100",
  prepared: "text-sky-900 bg-sky-100 dark:bg-sky-900/20 dark:text-sky-100",
  prepare_failed: "text-rose-900 bg-rose-100 dark:bg-rose-900/20 dark:text-rose-100",
  analyzing: "text-amber-900 bg-amber-100 dark:bg-amber-900/20 dark:text-amber-100",
  analyzed: "text-amber-900 bg-amber-100 dark:bg-amber-900/20 dark:text-amber-100",
  analyze_failed: "text-rose-900 bg-rose-100 dark:bg-rose-900/20 dark:text-rose-100",
  solution_generating: "text-violet-900 bg-violet-100 dark:bg-violet-900/20 dark:text-violet-100",
  solution_created: "text-violet-900 bg-violet-100 dark:bg-violet-900/20 dark:text-violet-100",
  solution_failed: "text-rose-900 bg-rose-100 dark:bg-rose-900/20 dark:text-rose-100",
  report_generating: "text-fuchsia-900 bg-fuchsia-100 dark:bg-fuchsia-900/20 dark:text-fuchsia-100",
  report_created: "text-fuchsia-900 bg-fuchsia-100 dark:bg-fuchsia-900/20 dark:text-fuchsia-100",
  report_failed: "text-rose-900 bg-rose-100 dark:bg-rose-900/20 dark:text-rose-100",
  completed: "text-emerald-900 bg-emerald-100 dark:bg-emerald-900/20 dark:text-emerald-100",
  failed: "text-rose-900 bg-rose-100 dark:bg-rose-900/20 dark:text-rose-100",
  unknown: "text-zinc-900 bg-zinc-100 dark:bg-zinc-800 dark:text-zinc-100",
};

const STATUS_LABEL_MAP: Record<string, string> = {
  received: "로그 획득",
  prepared: "분석 준비 완료",
  prepare_failed: "분석 준비 실패",
  analyzing: "분석중",
  analyzed: "분석 완료",
  analyze_failed: "분석 실패",
  solution_generating: "솔루션 생성중",
  solution_created: "솔루션 생성 완료",
  solution_failed: "솔루션 생성 실패",
  report_generating: "리포트 생성중",
  report_created: "리포트 생성 완료",
  report_failed: "리포트 생성 실패",
  completed: "수행 완료",
  failed: "오류 발생",
};

type EventRow = EventItem & {
  summary: string;
};

type Props = {
  eventRows: EventRow[];
  pageSize?: number;
};

function normalizeStatus(status: string | undefined | null) {
  return (
    String(status ?? "")
      .trim()
      .replace(/\s+/g, "_")
      .replace(/-/g, "_")
      .toLowerCase() || "unknown"
  );
}

function StatusBubble({ status }: { status: string }) {
  const normalized = normalizeStatus(status);
  const colorClass =
    STATUS_STYLE_MAP[normalized] ?? STATUS_STYLE_MAP.unknown;

  const isSpinning = [
    "analyzing",
    "solution_generating",
    "report_generating",
  ].includes(normalized);

  return (
    <span className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold ${colorClass}`}>
      {isSpinning ? (
        <span className="h-3.5 w-3.5 border-2 border-current border-t-transparent rounded-full animate-spin" />
      ) : (
        <span className="h-3.5 w-3.5 border-2 border-current rounded-full text-[10px] flex items-center justify-center">✓</span>
      )}
      {STATUS_LABEL_MAP[normalized] ?? normalized.toUpperCase()}
    </span>
  );
}

function sortEventRows(rows: EventRow[]) {
  return [...rows].sort((a, b) => b.id - a.id);
}

function formatCreatedAt(value: string) {
  return new Intl.DateTimeFormat("ko-KR", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).format(new Date(value));
}

export default function EventTableClient({
  eventRows,
  pageSize = 10,
}: Props) {
  const [rows, setRows] = useState<EventRow[]>((() => sortEventRows(eventRows)));
  const [page, setPage] = useState(1);

  const pageCount = Math.max(1, Math.ceil(rows.length / pageSize));

  const currentRows = useMemo(
    () => rows.slice((page - 1) * pageSize, page * pageSize),
    [rows, page, pageSize]
  );

  useEffect(() => {
    setRows(sortEventRows(eventRows));
    setPage(1);
  }, [eventRows]);

  const fetchLatestEvents = useCallback(async () => {
    try {
      const eventItems = (await getEvents()) ?? [];

      setRows((prev) => {
        const map = new Map(prev.map((r) => [r.id, r.summary]));
        return sortEventRows(
          eventItems.map((e) => ({
            ...e,
            summary: String(map.get(e.id) ?? "분석중"),
          }))
        );
      });

      const summaries = await Promise.all(
        eventItems.map(async (e) => {
          try {
            const summary = await getAnalysisSummary(e.id);
            return [e.id, String(summary?.summary ?? "")] as [number, string];
          } catch {
            return [e.id, ""];
          }
        })
      );

      const summaryMap = new Map<number, string>(
        summaries.filter(
          (v): v is [number, string] =>
            typeof v[1] === "string" && v[1].length > 0
        )
      );

      if (summaryMap.size > 0) {
        setRows((prev) =>
          sortEventRows(
            prev.map((r) => ({
              ...r,
              summary: summaryMap.get(r.id) ?? r.summary,
            }))
          )
        );
      }
    } catch { }
  }, []);

  useEffect(() => {
    const ref = doc(firestore, "update", "trigger");
    return onSnapshot(ref, () => fetchLatestEvents());
  }, [fetchLatestEvents]);

  return (
    <div className="rounded-2xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-slate-900">

      {/* HEADER */}
      <div className="overflow-hidden rounded-2xl border border-zinc-100 text-sm dark:border-zinc-700">
        <div className="grid grid-cols-[0.6fr_1fr_1.2fr_3fr_1.2fr_0.5fr_1.2fr] px-5 py-3 text-xs bg-zinc-100 dark:bg-slate-900 uppercase">
          <span>ID</span>
          <span>RobotId</span> {/* ✅ 추가 */}
          <span>Function</span>
          <span>Summary</span>
          <span>Status</span>
          <span>Action</span>
          <span className="text-right">Created</span>
        </div>

        {currentRows.map((event) => (
          <Link
            key={event.id}
            href={`/events/${event.id}`}
            className="grid grid-cols-[0.6fr_1fr_1.2fr_3fr_1.2fr_0.5fr_1.2fr] border-t border-zinc-100 dark:border-zinc-800/40 px-5 py-4 hover:bg-slate-100 dark:hover:bg-slate-900"
          >
            <span className="font-semibold">{event.id}</span>

            {/* ✅ RobotId */}
            <span className="text-zinc-400" />

            {/* Function */}
            <span className="text-zinc-400" />

            {/* Summary */}
            <span className="truncate">{event.summary}</span>

            {/* Status */}
            <div className="flex items-center">
              <StatusBubble status={event.status} />
            </div>

            {/* Action */}
            <div />

            {/* Created */}
            <span className="text-right text-zinc-500">
              {formatCreatedAt(event.createdAt)}
            </span>
          </Link>
        ))}
      </div>

      {/* PAGINATION */}
      <div className="mt-6 flex justify-between">
        <span className="text-sm text-zinc-500">
          {page} / {pageCount}
        </span>

        <div className="flex gap-2">
          <button onClick={() => setPage(1)}>First</button>
          <button onClick={() => setPage((p) => Math.max(1, p - 1))}>
            Prev
          </button>
          <button onClick={() => setPage((p) => Math.min(pageCount, p + 1))}>
            Next
          </button>
          <button onClick={() => setPage(pageCount)}>Last</button>
        </div>
      </div>
    </div>
  );
}