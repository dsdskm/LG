import { INTERNAL_SERVICE_BASES, proxyGetJson } from "../../../_lib/proxy";

export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ eventId: string }> },
) {
  const { eventId } = await params;
  return proxyGetJson(
    `${INTERNAL_SERVICE_BASES.reportGenerator}/reports/event/${encodeURIComponent(eventId)}`,
  );
}
