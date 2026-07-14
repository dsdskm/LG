// apps/llm_gateway/src/llm/vertex/vertex-types.ts

/** Vertex GenerateContent request body (최소 사용 필드만) */
export type VertexGenerateContentBody = {
    contents: Array<{
        role: "user" | "model" | string;
        parts: Array<{ text: string }>;
    }>;
    generationConfig?: {
        temperature?: number;
        maxOutputTokens?: number;
        // 순수 JSON 강제(코드펜스/잡설 제거)
        responseMimeType?: string;
        // Gemini 2.5: thinking 이 출력 토큰을 소진해 JSON 이 잘리는 것 방지(0=비활성)
        thinkingConfig?: { thinkingBudget?: number };
    };
};

/** Vertex response의 parts(텍스트) */
export type VertexContentPart = {
    text?: string;
};

/** Vertex response의 content */
export type VertexContent = {
    role?: string;
    parts?: VertexContentPart[];
};

/** Vertex response의 candidate */
export type VertexCandidate = {
    content?: VertexContent;
    finishReason?: string;
    avgLogprobs?: number;
};

/** Vertex GenerateContent response (필요 필드 + loose 허용) */
export type VertexGenerateContentResponse = {
    candidates?: VertexCandidate[];
    usageMetadata?: any;
    modelVersion?: string;
    createTime?: string;
    responseId?: string;

    // error 응답/추가 필드는 런타임에서 올 수 있으니 허용
    [k: string]: any;
};

/** Vertex 호출 파라미터 (Client 입력) */
export type VertexCallParams = {
    projectId: string;
    location: string; // global or us-central1 ...
    modelId: string;

    requestId: string;
    prompt: string;

    temperature: number;
    maxOutputTokens: number;

    timeoutMs: number;
};

/** Vertex 호출 결과 (Client 출력) */
export type VertexCallResult = {
    ok: boolean;
    status: number;
    elapsedMs: number;
    url: string;
    responseHeaders: Record<string, string>;
    text: string;
    raw: any;
};