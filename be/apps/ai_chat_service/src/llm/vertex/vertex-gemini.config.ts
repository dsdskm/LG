export type VertexGeminiConfig = {
  projectId: string;
  defaultLocation: string;
  defaultModelId: string;
  defaultTemperature: number;
  defaultMaxOutputTokens: number;
  timeoutMs: number;
  googleAuthScope: string;
};

function toNumber(value: string | undefined, fallback: number) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

export function loadVertexGeminiConfig(): VertexGeminiConfig {
  const projectId = (process.env.GOOGLE_CLOUD_PROJECT ?? '').trim();

  return {
    projectId,
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
