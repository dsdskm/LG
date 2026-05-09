// packages/http-api/src/api-client.ts
export class ApiError extends Error {
    readonly status: number;
    readonly url: string;
    readonly method: string;
    readonly bodyPreview?: string;

    constructor(params: { message: string; status: number; url: string; method: string; bodyPreview?: string }) {
        super(params.message);
        this.name = "ApiError";
        this.status = params.status;
        this.url = params.url;
        this.method = params.method;
        this.bodyPreview = params.bodyPreview;
    }
}

export type ApiRequestOptions = {
    timeoutMs?: number;
    headers?: Record<string, string>;
};

export class ApiClient {
    constructor(private readonly defaultTimeoutMs = Number(500_000)) { }

    async requestJson<T = unknown>(
        method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE",
        url: string,
        body?: any,
        opts: ApiRequestOptions = {},
    ): Promise<{ status: number; data: T | null; text: string }> {
        const timeoutMs = opts.timeoutMs ?? this.defaultTimeoutMs;

        const controller = new AbortController();
        const t = setTimeout(() => controller.abort(), timeoutMs);

        try {
            const headers: Record<string, string> = {
                "Content-Type": "application/json",
                ...(opts.headers ?? {}),
            };

            const res = await fetch(url, {
                method,
                headers,
                body: body === undefined ? undefined : JSON.stringify(body),
                signal: controller.signal,
            });

            const text = await res.text().catch(() => "");
            const data = safeJsonParse<T>(text);

            if (!res.ok) {
                const preview = text ? text.slice(0, 1000) : "";
                throw new ApiError({
                    message: `HTTP ${res.status} ${method} ${url}`,
                    status: res.status,
                    url,
                    method,
                    bodyPreview: preview,
                });
            }

            return { status: res.status, data, text };
        } catch (e: any) {
            const msg =
                e?.name === "AbortError" ? `timeout(${timeoutMs}ms) ${method} ${url}` : e?.message ?? String(e);

            if (e instanceof ApiError) throw e;

            throw new ApiError({
                message: msg,
                status: 0,
                url,
                method,
            });
        } finally {
            clearTimeout(t);
        }
    }
}

function safeJsonParse<T>(text: string): T | null {
    if (!text) return null;
    try {
        return JSON.parse(text) as T;
    } catch {
        return null;
    }
}