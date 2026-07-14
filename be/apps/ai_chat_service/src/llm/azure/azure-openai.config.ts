/**
 * Azure OpenAI 환경변수 설정
 */
export interface AzureOpenaiConfig {
  endpoint: string;
  apiKey: string;
  apiVersion: string;
  deployment: string;
  model: string;
  maxCompletionTokens: number;
  analysisInstruction: string;
  answerPreviewChars: number;
}

function toNumber(value: string | undefined, fallback: number) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

/**
 * 환경변수로부터 Azure OpenAI 설정 로드
 */
export function loadAzureOpenaiConfig(): AzureOpenaiConfig {
  return {
    endpoint: process.env.AZURE_OPENAI_ENDPOINT ?? '',
    apiKey: process.env.AZURE_OPENAI_API_KEY ?? '',
    apiVersion: process.env.AZURE_OPENAI_API_VERSION ?? '2024-12-01-preview',
    deployment: process.env.AZURE_OPENAI_DEPLOYMENT ?? 'gpt-5',
    model: process.env.AZURE_OPENAI_MODEL ?? 'gpt-5',
    maxCompletionTokens: toNumber(process.env.AZURE_OPENAI_MAX_TOKENS, 16384),
    analysisInstruction: (process.env.AZURE_ANALYSIS_INSTRUCTION ?? process.env.LLM_ANALYSIS_INSTRUCTION ?? '').trim(),
    answerPreviewChars: toNumber(process.env.AZURE_ANSWER_PREVIEW_CHARS, 2000),
  };
}

/**
 * Azure OpenAI 설정 검증
 */
export function assertAzureOpenaiConfig(config: AzureOpenaiConfig): void {
  if (!config.endpoint) {
    throw new Error('AZURE_OPENAI_ENDPOINT is required');
  }
  if (!config.apiKey) {
    throw new Error('AZURE_OPENAI_API_KEY is required');
  }
  if (!config.deployment) {
    throw new Error('AZURE_OPENAI_DEPLOYMENT is required');
  }
}
