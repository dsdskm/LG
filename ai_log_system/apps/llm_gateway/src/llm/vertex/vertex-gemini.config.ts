// apps/llm_gateway/src/llm/vertex/vertex-gemini.config.ts

export type VertexGeminiConfig = {
    projectId: string;

    /** Vertex AI 호출 location. global 권장 */
    defaultLocation: string;

    /** 기본 모델 ID */
    defaultModelId: string;

    /** 생성 파라미터 기본값 */
    defaultTemperature: number;
    defaultMaxOutputTokens: number;

    /** 네트워크/서버 timeout */
    timeoutMs: number;

    /** ✅ GoogleAuth scope (기존 client에서 env로 읽던 값) */
    googleAuthScope: string;

    /** ✅ LLM 분석용 지침 프롬프트 */
    analysisInstruction: string;

    /** ✅ 성공 응답 로그 preview 길이(문자) */
    answerPreviewChars: number;

    /** ✅ 성공 응답 전체를 로그로 찍을지 여부(기본 false) */
    logFullAnswer: boolean;
};

function toNumber(value: string | undefined, fallback: number) {
    const n = Number(value);
    return Number.isFinite(n) ? n : fallback;
}

function toBool(value: string | undefined, fallback = false) {
    if (value == null) return fallback;
    const v = value.trim().toLowerCase();
    if (v === "1" || v === "true" || v === "yes" || v === "y") return true;
    if (v === "0" || v === "false" || v === "no" || v === "n") return false;
    return fallback;
}

const DEFAULT_ANALYSIS_INSTRUCTION = [
    "너는 로봇 로그 분석가다.",
    "아래 로그를 보고 로그 내용, 원인, 솔루션을 뽑아줘,",
    "출력은 JSON 하나로만 반환해라.",
    "절대로 Markdown 코드블록(예: ```json ... ```)을 쓰지 말고 JSON만 출력해라.",
    "형식: {summary:string, reason: string, solutions: string[]}",
].join("\n");

export function loadVertexGeminiConfig(): VertexGeminiConfig {
    const projectId = (process.env.GOOGLE_CLOUD_PROJECT ?? "").trim();

    return {
        projectId,

        defaultLocation: (process.env.GOOGLE_CLOUD_LOCATION ?? "global").trim(),
        defaultModelId: (process.env.VERTEX_MODEL_ID ?? "gemini-2.5-flash").trim(),

        defaultTemperature: toNumber(process.env.VERTEX_TEMPERATURE, 0.2),
        defaultMaxOutputTokens: toNumber(process.env.VERTEX_MAX_OUTPUT_TOKENS, 1024),

        timeoutMs: toNumber(process.env.VERTEX_TIMEOUT_MS, 30_000),

        // ✅ 기존 client의 GOOGLE_AUTH_URL -> config로 이동 (실제로는 scope)
        googleAuthScope: (process.env.GOOGLE_AUTH_URL ?? "https://www.googleapis.com/auth/cloud-platform").trim(),

        // ✅ 서비스에서 참조 중인 필드들
        analysisInstruction: (process.env.LLM_ANALYSIS_INSTRUCTION ?? DEFAULT_ANALYSIS_INSTRUCTION).trim(),
        answerPreviewChars: toNumber(process.env.LLM_ANSWER_PREVIEW_CHARS, 2000),
        logFullAnswer: toBool(process.env.LLM_LOG_FULL_ANSWER, false),
    };
}

export function assertVertexConfig(cfg: VertexGeminiConfig) {
    if (!cfg.projectId) {
        throw new Error("GOOGLE_CLOUD_PROJECT is not set");
    }
}