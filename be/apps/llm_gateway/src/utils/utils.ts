
/** raw를 로그용으로 안전하게 stringify */
export function safeStringify(v: any) {
    try {
        if (typeof v === "string") return v;
        return JSON.stringify(v);
    } catch {
        return String(v);
    }
}

export async function fetchWithTimeout(url: string, init: RequestInit, timeoutMs: number): Promise<Response> {
    const controller = new AbortController();
    const t = setTimeout(() => controller.abort(), timeoutMs);

    try {
        return await fetch(url, { ...init, signal: controller.signal });
    } finally {
        clearTimeout(t);
    }
}

/** headers에서 필요한 것만 뽑기 */
export function pickHeaders(headers: Headers, keys: string[]) {
    const out: Record<string, string> = {};
    for (const k of keys) {
        const v = headers.get(k);
        if (v) out[k] = v;
    }
    return out;
}

/** JSON 파싱 실패해도 터지지 않게 */
export function safeJsonParse(text: string) {
    if (!text) return null;
    try {
        return JSON.parse(text);
    } catch {
        return null;
    }
}

/** 길이 제한 */
export function truncate(s: string, max: number) {
    if (!s) return "";
    return s.length > max ? s.slice(0, max) + ` ... (truncated ${s.length - max})` : s;
}