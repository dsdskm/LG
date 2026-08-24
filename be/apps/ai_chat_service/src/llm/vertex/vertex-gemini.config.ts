import * as path from 'path';

export type VertexGeminiConfig = {
  projectId: string;
  /** 서비스 계정 키 파일 경로. 빈 문자열이면 환경 ADC 사용 */
  keyFilePath: string;
  defaultLocation: string;
  defaultModelId: string;
  defaultTemperature: number;
  defaultMaxOutputTokens: number;
  timeoutMs: number;
  googleAuthScope: string;
};

/** dist/llm/vertex 기준으로 ai_chat_service 앱 루트 */
const APP_ROOT = path.resolve(__dirname, '../../..');

/** .env 의 GOOGLE_APPLICATION_CREDENTIALS(앱 루트 기준 상대경로)로 키 파일 경로 결정 */
function resolveKeyFilePath(): string {
  const configured = (process.env.GOOGLE_APPLICATION_CREDENTIALS ?? '').trim();
  if (!configured) return '';
  return path.isAbsolute(configured) ? configured : path.resolve(APP_ROOT, configured);
}

function toNumber(value: string | undefined, fallback: number) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

export function loadVertexGeminiConfig(): VertexGeminiConfig {
  const projectId = (process.env.GOOGLE_CLOUD_PROJECT ?? '').trim();
  console.log(`projectId ${projectId}`)
  return {
    projectId,
    keyFilePath: resolveKeyFilePath(),
    defaultLocation: (process.env.GOOGLE_CLOUD_LOCATION ?? 'global').trim(),
    defaultModelId: (process.env.VERTEX_MODEL_ID ?? 'gemini-2.5-flash').trim(),
    defaultTemperature: toNumber(process.env.VERTEX_TEMPERATURE, 0.2),
    defaultMaxOutputTokens: toNumber(process.env.VERTEX_MAX_OUTPUT_TOKENS, 1024),
    timeoutMs: toNumber(process.env.VERTEX_TIMEOUT_MS, 30_000),
    googleAuthScope: (
      process.env.GOOGLE_AUTH_URL ??
      'https://www.googleapis.com/auth/cloud-platform'
    ).trim(),
  };
}

export function assertVertexConfig(cfg: VertexGeminiConfig) {
  if (!cfg.projectId) {
    throw new Error('GOOGLE_CLOUD_PROJECT is not set');
  }
}
