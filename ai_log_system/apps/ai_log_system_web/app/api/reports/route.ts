import { INTERNAL_SERVICE_BASES, proxyGetJson } from "../_lib/proxy";

export const dynamic = "force-dynamic";

export async function GET() {
  return proxyGetJson(`${INTERNAL_SERVICE_BASES.reportGenerator}/reports`);
}
