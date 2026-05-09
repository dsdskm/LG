import { NextResponse } from "next/server";

function isDockerRuntime(): boolean {
  const raw =
    process.env.RUN_IN_DOCKER ?? process.env.NEXT_PUBLIC_RUN_IN_DOCKER ?? "";
  return ["1", "true", "yes", "on"].includes(raw.trim().toLowerCase());
}

function pickBaseUrl(options: {
  localEnv?: string;
  containerEnv?: string;
  localFallback: string;
  containerFallback: string;
}) {
  const inDocker = isDockerRuntime();

  if (inDocker) {
    return options.containerEnv ?? options.containerFallback;
  }

  return options.localEnv ?? options.localFallback;
}

const EVENT_RECEIVER_BASE = pickBaseUrl({
  localEnv: process.env.URL_EVENT_RECEIVER,
  containerEnv: process.env.URL_EVENT_RECEIVER_CONTAINER,
  localFallback: "http://localhost:3001",
  containerFallback: "http://event_receiver_service:3001",
});

const EVENT_ANALYZER_BASE = pickBaseUrl({
  localEnv: process.env.URL_EVENT_ANALYZER,
  containerEnv: process.env.URL_EVENT_ANALYZER_CONTAINER,
  localFallback: "http://localhost:3002",
  containerFallback: "http://event_analyzer_service:3002",
});

export const INTERNAL_SERVICE_BASES = {
  eventReceiver: EVENT_RECEIVER_BASE,
  eventAnalyzer: EVENT_ANALYZER_BASE,
} as const;

export async function proxyGetJson(url: string) {
  try {
    const response = await fetch(url, { cache: "no-store" });

    if (!response.ok) {
      return NextResponse.json(null, { status: response.status });
    }

    const data = await response.json();
    return NextResponse.json(data, { status: 200 });
  } catch {
    return NextResponse.json(
      { message: "Upstream service is unavailable." },
      { status: 502 },
    );
  }
}
