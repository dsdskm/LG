"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { List, type RowComponentProps } from "react-window";

type GenState = "IDLE" | "RUNNING" | "PAUSED";

type GenStats = {
  ok: boolean;
  state: GenState;
  receiverUrl: string;
  config: {
    durationMinutes: number;
    logsPerSecond: number;
    errorTemplates: string[];
    errorCount: number;
  };
  progress: number;
  generated: number;
  errorInjected: number;
  lastBatchId: string | null;
  lastSendResult: any;
  lastError: string | null;
};

type Activity = { ts: number; level: "INFO" | "WARN" | "ERROR"; text: string };

const ROW_HEIGHT = 22;

/** ✅ rowProps로 넘길 타입 */
type ActivityRowProps = RowComponentProps<{ data: Activity[] }>;

const ActivityRow = ({ index, style, data }: ActivityRowProps): React.ReactElement | null => {
  const item = data[index];
  const color =
    item.level === "ERROR"
      ? "text-rose-300"
      : item.level === "WARN"
        ? "text-amber-300"
        : "text-slate-200";

  const t = new Date(item.ts);
  const time = `${String(t.getHours()).padStart(2, "0")}:${String(t.getMinutes()).padStart(2, "0")}:${String(
    t.getSeconds()
  ).padStart(2, "0")}.${String(t.getMilliseconds()).padStart(3, "0")}`;

  return (
    <div style={style} className="flex items-center gap-3 px-3 text-[12px]">
      <span className="w-24 shrink-0 tabular-nums text-slate-500">{time}</span>
      <span className={`w-14 shrink-0 font-extrabold ${color}`}>{item.level}</span>
      <span className="truncate whitespace-pre text-slate-100">{item.text}</span>
    </div>
  );
};

export default function Page() {
  const GEN_BASE = process.env.NEXT_PUBLIC_EVENT_GENERATOR_URL ?? "http://localhost:9001";
  const RCV_BASE = process.env.NEXT_PUBLIC_EVENT_RECEIVER_URL ?? "http://localhost:3001";
  console.log(`GEN_BASE ${GEN_BASE}`)
  console.log(`RCV_BASE ${RCV_BASE}`)
  const [stats, setStats] = useState<GenStats | null>(null); // (선택) 뱃지용으로만 사용
  const [activity, setActivity] = useState<Activity[]>([]);
  const listRef = useRef<any>(null);

  // config inputs (logsPerSecond 제거)
  const [durationMinutes, setDurationMinutes] = useState(1);
  const [errorCount, setErrorCount] = useState(1);
  const [logsPerSecond, setLogsPerSecond] = useState(1); // ✅ 추가
  const [errorTemplatesText, setErrorTemplatesText] = useState(
    "motor overcurrent detected\nlidar timeout\nE-STOP pressed\nlocalization jump"
  );

  // (옵션) 받은 mcap 다운로드 링크
  const [download, setDownload] = useState<{ url: string; filename: string } | null>(null);

  const stateBadge = useMemo(() => {
    const s = stats?.state;
    // stats 폴링을 안 해도 되지만, 지금은 간단히 “연결됨/안됨” 정도만 표시
    if (!s) return { text: "READY", cls: "border-slate-600 text-slate-300" };
    if (s === "IDLE") return { text: "IDLE", cls: "border-slate-600 text-slate-300" };
    if (s === "PAUSED") return { text: "PAUSED", cls: "border-amber-500 text-amber-200" };
    return { text: "RUNNING", cls: "border-emerald-500 text-emerald-200" };
  }, [stats]);

  function pushAct(level: Activity["level"], text: string) {
    setActivity((prev) => {
      const next = prev.concat({ ts: Date.now(), level, text });
      return next.length > 5000 ? next.slice(next.length - 5000) : next;
    });
  }


  // activity tail follow (react-window v2)
  useEffect(() => {
    const api = listRef.current as any;
    const lastIndex = activity.length - 1;
    if (!api) return;
    if (lastIndex < 0) return;

    try {
      if (typeof api.scrollToRow === "function") {
        api.scrollToRow({ index: lastIndex, align: "end", behavior: "auto" });
      } else if (typeof api.scrollToIndex === "function") {
        api.scrollToIndex(lastIndex);
      } else if (typeof api.scrollToOffset === "function") {
        api.scrollToOffset(activity.length * ROW_HEIGHT);
      }
    } catch {
      // ignore
    }
  }, [activity.length]);

  // ✅ Send: generator에 config 보내고, 생성된 mcap(바이너리) 응답을 받아 콘솔에 출력
  async function send() {
    // 이전 다운로드 URL 정리
    if (download?.url) URL.revokeObjectURL(download.url);
    setDownload(null);

    const errorTemplates = errorTemplatesText
      .split("\n")
      .map((s) => s.trim())
      .filter(Boolean);

    const payload = {
      durationMinutes,
      logsPerSecond,
      errorCount,
      errorTemplates,
      receiverUrl: RCV_BASE,
      // logsPerSecond는 UI에서 제거했으니 backend default 사용(또는 backend에서 고정)
    };

    pushAct("INFO", `Send requested: duration=${durationMinutes}m, lps=${logsPerSecond}, errorCount=${errorCount}`);
    pushAct("INFO", `POST ${GEN_BASE}/send → receiver=${RCV_BASE}`);

    try {
      const res = await fetch(`${GEN_BASE}/send`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const batchId = res.headers.get("x-batch-id") ?? "-";
      const logCount = res.headers.get("x-log-count") ?? "-";
      const receiverStatus = res.headers.get("x-receiver-status") ?? "-";
      const receiverBody = res.headers.get("x-receiver-json") ?? "";

      const buf = await res.arrayBuffer();
      pushAct(
        res.ok ? "INFO" : "ERROR",
        `Send response: http=${res.status}, batchId=${batchId}, logs=${logCount}, bytes=${buf.byteLength}, receiverStatus=${receiverStatus}`
      );

      if (receiverBody) {
        // URL-encoded로 올 수 있으니 decode 시도
        let decoded = receiverBody;
        try {
          decoded = decodeURIComponent(receiverBody);
        } catch { }
        pushAct("INFO", `receiverJson: ${decoded}`);
      }

      // (옵션) mcap 다운로드 링크 제공
      const blob = new Blob([buf], { type: "application/octet-stream" });
      const url = URL.createObjectURL(blob);
      const filename = `${batchId}.mcap`;
      setDownload({ url, filename });

      // (옵션) 파일 앞부분 hex 프리뷰 32바이트
      const u8 = new Uint8Array(buf.slice(0, Math.min(32, buf.byteLength)));
      const hex = Array.from(u8).map((b) => b.toString(16).padStart(2, "0")).join(" ");
      pushAct("INFO", `mcap head(<=32B): ${hex}${buf.byteLength > 32 ? " ..." : ""}`);

    } catch (e: any) {
      pushAct("ERROR", `Send failed: ${String(e?.message ?? e)}`);
    }
  }

  return (
    <div className="h-screen p-3 md:p-4 flex flex-col gap-3 bg-slate-950">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="text-lg font-black">Simulator Dashboard</div>
        <span className={`text-[12px] font-black px-2.5 py-1 rounded-full border ${stateBadge.cls}`}>
          {stateBadge.text}
        </span>
      </div>

      {/* Controls only (Status 패널 제거) */}
      <section className="rounded-xl border border-slate-800 bg-slate-900/40 p-4">
        <div className="text-sm font-extrabold mb-3">Controls</div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-[12px]">
          <Field label="몇 분치 로그 생성 (durationMinutes)">
            <InputNumber min={1} max={60} value={durationMinutes} onChange={setDurationMinutes} />
          </Field>


          <Field label="초당 로그 수 (logsPerSecond)">
            <InputNumber min={1} max={500} value={logsPerSecond} onChange={setLogsPerSecond} />
          </Field>


          <Field label="에러 로그 발생 횟수 (errorCount)">
            <InputNumber min={0} max={200000} value={errorCount} onChange={setErrorCount} />
          </Field>

          <Field label="에러 메시지 템플릿(줄바꿈으로 여러 개)" className="md:col-span-2">
            <textarea
              className="w-full min-h-[110px] rounded-lg border border-slate-700 bg-slate-950/40 p-3 outline-none focus:ring-2 focus:ring-sky-600"
              value={errorTemplatesText}
              onChange={(e) => setErrorTemplatesText(e.target.value)}
            />
          </Field>

          <div className="md:col-span-2 flex flex-wrap items-center gap-2 pt-1">
            <Btn variant="primary" onClick={send}>
              Send
            </Btn>

            {download && (
              <a
                className="h-9 px-3 rounded-lg border border-slate-700 bg-white/5 hover:bg-white/10 text-[12px] font-extrabold flex items-center"
                href={download.url}
                download={download.filename}
              >
                Download MCAP
              </a>
            )}
          </div>

          <div className="md:col-span-2 mt-2 text-[12px] text-slate-400">
            ※ <b className="text-slate-200">Send 1번</b>에 <b className="text-slate-200">N분치 로그량을 MCAP로 생성</b> →
            receiver로 업로드 → <b className="text-slate-200">MCAP 바이너리를 응답으로 반환</b>합니다.
          </div>
        </div>
      </section>

      {/* Activity Console (응답 로그 표시) */}
      <section className="flex-1 rounded-xl border border-slate-800 bg-slate-950 overflow-hidden flex flex-col">
        <div className="px-3 py-2 border-b border-slate-800 flex items-center justify-between">
          <div className="font-extrabold">Activity Console</div>
          <div className="text-[12px] text-slate-400">react-window v2 List</div>
        </div>

        <div className="relative flex-1">
          <List
            listRef={listRef}
            defaultHeight={600}
            style={{ height: "100%", width: "100%" }}
            rowCount={activity.length}
            rowHeight={ROW_HEIGHT}
            rowComponent={ActivityRow}
            rowProps={{ data: activity }}
            overscanCount={10}
          />

          {activity.length === 0 && (
            <div className="absolute inset-x-0 top-14 text-center text-slate-400 pointer-events-none">
              상단에서 <b className="text-slate-200">Send</b>를 눌러 실행해보세요.
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

/* ---- small UI ---- */
function Field({ label, className, children }: { label: string; className?: string; children: React.ReactNode }) {
  return (
    <div className={className}>
      <div className="mb-1 text-slate-400">{label}</div>
      {children}
    </div>
  );
}

function Btn({
  children,
  onClick,
  variant,
}: {
  children: React.ReactNode;
  onClick?: () => void;
  variant?: "primary" | "warn" | "danger";
}) {
  const base = "h-9 px-3 rounded-lg border text-[12px] font-extrabold transition active:scale-[0.98]";
  const cls =
    variant === "primary"
      ? "border-sky-500/60 bg-sky-500/15 hover:bg-sky-500/20"
      : variant === "warn"
        ? "border-amber-500/60 bg-amber-500/15 hover:bg-amber-500/20"
        : variant === "danger"
          ? "border-rose-500/60 bg-rose-500/15 hover:bg-rose-500/20"
          : "border-slate-700 bg-white/5 hover:bg-white/10";
  return (
    <button className={`${base} ${cls}`} onClick={onClick}>
      {children}
    </button>
  );
}

function InputNumber({
  value,
  onChange,
  min,
  max,
}: {
  value: number;
  onChange: (v: number) => void;
  min?: number;
  max?: number;
}) {
  return (
    <input
      className="w-full h-9 rounded-lg border border-slate-700 bg-slate-950/40 px-3 outline-none focus:ring-2 focus:ring-sky-600"
      type="number"
      min={min}
      max={max}
      value={value}
      onChange={(e) => onChange(Number(e.target.value))}
    />
  );
}