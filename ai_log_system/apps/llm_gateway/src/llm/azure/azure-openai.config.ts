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

const DEFAULT_ANALYSIS_INSTRUCTION = [
  '너는 로봇 로그 분석가다.',
  '아래 로그를 보고 현상, 원인, 솔루션, 이슈 기능, 이슈 심각도를 분석해줘.',
  '출력은 JSON 하나로만 반환해라.',
  '절대로 Markdown 코드블록(예: ```json ... ```)을 쓰지 말고 JSON만 출력해라.',
  '형식: {summary:string, reason:string, solutions:string[], func:string, severity:string}',
  'func는 이슈 관련 기능(예: 네비게이션, HW, SW, 센서, 통신 등)을 나타낸다.',
  'severity는 이슈 심각도로 상, 중, 하 중 하나만 출력한다.',
].join('\n');

/**
 * 환경변수로부터 Azure OpenAI 설정 로드
 */
export function loadAzureOpenaiConfig(): AzureOpenaiConfig {
  return {
    endpoint: process.env.AZURE_OPENAI_ENDPOINT ?? '',
    apiKey: process.env.AZURE_OPENAI_API_KEY ?? '',
    apiVersion: process.env.AZURE_OPENAI_API_VERSION ?? '2024-12-01-preview',
    deployment: process.env.AZURE_OPENAI_DEPLOYMENT ?? 'gpt-4',
    model: process.env.AZURE_OPENAI_MODEL ?? 'gpt-4',
    maxCompletionTokens: toNumber(process.env.AZURE_OPENAI_MAX_TOKENS, 16384),
    analysisInstruction: DEFAULT_ANALYSIS_INSTRUCTION.trim(),
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
