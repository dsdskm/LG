// apps/llm_gateway/src/llm/vertex/vertex-gemini.config.ts

import * as fs from "fs";
import * as path from "path";

export type VertexGeminiConfig = {
    projectId: string;

    /** ✅ 서비스 계정 키 파일 경로 (ADC가 이 파일로 인증). 빈 문자열이면 환경 ADC 사용 */
    keyFilePath: string;

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

/** dist/service/vertex 기준으로 llm_gateway 앱 루트 */
const APP_ROOT = path.resolve(__dirname, "../../..");

/** .env 의 GOOGLE_APPLICATION_CREDENTIALS(앱 루트 기준 상대경로)로 키 파일 경로 결정 */
function resolveKeyFilePath(): string {
    const configured = (process.env.GOOGLE_APPLICATION_CREDENTIALS ?? "").trim();
    if (!configured) return "";
    return path.isAbsolute(configured) ? configured : path.resolve(APP_ROOT, configured);
}

/** 키 파일에서 project_id 추출 (실패 시 빈 문자열) */
function readProjectIdFromKeyFile(keyFilePath: string): string {
    if (!keyFilePath) return "";
    try {
        const raw = fs.readFileSync(keyFilePath, "utf8");
        const json = JSON.parse(raw);
        return typeof json?.project_id === "string" ? json.project_id.trim() : "";
    } catch {
        return "";
    }
}

export function loadVertexGeminiConfig(): VertexGeminiConfig {
    const keyFilePath = resolveKeyFilePath();

    // 우선순위: 환경변수 GOOGLE_CLOUD_PROJECT > 키 파일의 project_id
    const projectId =
        (process.env.GOOGLE_CLOUD_PROJECT ?? "").trim() ||
        readProjectIdFromKeyFile(keyFilePath);

    return {
        projectId,
        keyFilePath,

        defaultLocation: (process.env.GOOGLE_CLOUD_LOCATION ?? "global").trim(),
        defaultModelId: (process.env.VERTEX_MODEL_ID ?? "gemini-2.5-flash").trim(),

        defaultTemperature: toNumber(process.env.VERTEX_TEMPERATURE, 0.2),
        defaultMaxOutputTokens: toNumber(process.env.VERTEX_MAX_OUTPUT_TOKENS, 1024),

        timeoutMs: toNumber(process.env.VERTEX_TIMEOUT_MS, 30_000),

        // ✅ 기존 client의 GOOGLE_AUTH_URL -> config로 이동 (실제로는 scope)
        googleAuthScope: (process.env.GOOGLE_AUTH_URL ?? "https://www.googleapis.com/auth/cloud-platform").trim(),

        // ✅ 서비스에서 참조 중인 필드들
        analysisInstruction: (process.env.VERTEX_ANALYSIS_INSTRUCTION ?? process.env.LLM_ANALYSIS_INSTRUCTION ?? "").trim(),
        answerPreviewChars: toNumber(process.env.LLM_ANSWER_PREVIEW_CHARS, 2000),
        logFullAnswer: toBool(process.env.LLM_LOG_FULL_ANSWER, false),
    };
}

export function assertVertexConfig(cfg: VertexGeminiConfig) {
    if (!cfg.projectId) {
        throw new Error("GOOGLE_CLOUD_PROJECT is not set");
    }
}