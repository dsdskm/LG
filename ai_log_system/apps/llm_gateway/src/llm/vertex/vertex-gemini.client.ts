// apps/llm_gateway/src/llm/vertex/vertex-gemini.client.ts

import { GoogleAuth } from "google-auth-library";
import type {
    VertexCallParams,
    VertexCallResult,
    VertexGenerateContentBody,
    VertexGenerateContentResponse,
} from "./vertex-types";
import { fetchWithTimeout, pickHeaders, safeJsonParse, truncate } from "src/utils/utils";

export class VertexGeminiClient {
    private readonly auth: GoogleAuth;

    constructor(
        private readonly log: { log: Function; debug: Function; error: Function },
        authScope: string,
    ) {
        // ✅ ADC 기반 인증 (scope는 config에서 주입)
        this.auth = new GoogleAuth({
            scopes: [authScope],
        });
    }

    async generateContent(params: VertexCallParams): Promise<VertexCallResult> {
        const startedAt = Date.now();
        const url = this.buildGenerateContentUrl(params.projectId, params.location, params.modelId);

        const accessToken = await this.getAccessToken();
        if (!accessToken) {
            return {
                ok: false,
                status: 0,
                elapsedMs: Date.now() - startedAt,
                url,
                responseHeaders: {},
                text: "",
                raw: { error: "Failed to acquire access token (ADC)" },
            };
        }

        const body: VertexGenerateContentBody = {
            contents: [{ role: "user", parts: [{ text: params.prompt }] }],
            generationConfig: {
                temperature: params.temperature,
                maxOutputTokens: params.maxOutputTokens,
            },
        };

        try {
            const res = await fetchWithTimeout(
                url,
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        Authorization: `Bearer ${accessToken}`,
                        "X-Request-Id": params.requestId,
                    },
                    body: JSON.stringify(body),
                },
                params.timeoutMs,
            );

            const elapsedMs = Date.now() - startedAt;

            const respHeaders = pickHeaders(res.headers, [
                "content-type",
                "x-request-id",
                "x-goog-request-id",
                "server",
                "date",
            ]);

            const rawText = await res.text().catch(() => "");
            const json = safeJsonParse(rawText) as VertexGenerateContentResponse | null;

            const text = this.extractText(json);

            if (!res.ok) {
                this.log.error(
                    `[${params.requestId}] Vertex error body=${truncate(rawText || JSON.stringify(json), 4000)}`,
                );
            }

            return {
                ok: res.ok,
                status: res.status,
                elapsedMs,
                url,
                responseHeaders: respHeaders,
                text,
                raw: json ?? rawText,
            };
        } catch (e: any) {
            const elapsedMs = Date.now() - startedAt;

            const errMsg =
                e?.name === "AbortError"
                    ? `Vertex request timed out (${params.timeoutMs}ms)`
                    : e?.message ?? "fetch failed";

            this.log.error(`[${params.requestId}] Vertex fetch failed elapsedMs=${elapsedMs} err=${errMsg}`);

            return {
                ok: false,
                status: 0,
                elapsedMs,
                url,
                responseHeaders: {},
                text: "",
                raw: { error: errMsg },
            };
        }
    }

    private buildGenerateContentUrl(projectId: string, location: string, modelId: string) {
        const host = location === "global" ? "aiplatform.googleapis.com" : `${location}-aiplatform.googleapis.com`;
        const modelResource = `projects/${projectId}/locations/${location}/publishers/google/models/${modelId}`;
        return `https://${host}/v1/${modelResource}:generateContent`;
    }

    private async getAccessToken(): Promise<string | null> {
        const client = await this.auth.getClient();
        const token = await client.getAccessToken();
        const accessToken = typeof token === "string" ? token : token?.token;
        return accessToken ?? null;
    }

    private extractText(resp: VertexGenerateContentResponse | null): string {
        try {
            const parts = resp?.candidates?.[0]?.content?.parts;
            if (Array.isArray(parts)) {
                return parts.map((p) => p?.text).filter(Boolean).join("\n");
            }
        } catch { }
        return "";
    }
}