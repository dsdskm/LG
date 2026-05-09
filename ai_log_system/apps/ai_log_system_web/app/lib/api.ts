import type {
  AnalyzerSummaryResponse,
  EventItem,
} from "@ai-log/shared-contracts";

type FetchResult<T> = {
  ok: boolean;
  status: number;
  data: T | null;
};

function resolveRequestUrl(url: string): string {
  if (/^https?:\/\//i.test(url)) {
    return url;
  }

  if (typeof window !== "undefined") {
    return url;
  }

  const port = String(process.env.PORT_WEB ?? "3006").trim();
  const internalOrigin =
    process.env.NEXT_INTERNAL_ORIGIN ??
    process.env.INTERNAL_WEB_ORIGIN ??
    `http://127.0.0.1:${port}`;

  return `${internalOrigin}${url}`;
}

async function fetchJson<T>(url: string): Promise<FetchResult<T>> {
  try {
    const res = await fetch(resolveRequestUrl(url), { cache: "no-store" });
    const data = res.ok ? ((await res.json()) as T) : null;
    return { ok: res.ok, status: res.status, data };
  } catch {
    return { ok: false, status: 0, data: null };
  }
}

export async function getEvents(): Promise<EventItem[] | null> {
  return (await fetchJson<EventItem[]>("/api/events")).data;
}

export async function getAnalysisSummary(
  eventId: number,
): Promise<AnalyzerSummaryResponse | null> {
  return (
    await fetchJson<AnalyzerSummaryResponse>(
      `/api/analysis/${eventId}`,
    )
  ).data;
}

export async function getEventById(
  eventId: string,
): Promise<FetchResult<EventItem>> {
  return await fetchJson<EventItem>(
    `/api/events/${encodeURIComponent(eventId)}`,
  );
}