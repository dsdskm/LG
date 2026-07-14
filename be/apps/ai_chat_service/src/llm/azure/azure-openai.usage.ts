import * as appInsights from 'applicationinsights';
import os from 'os';

const APP_INSIGHTS_KEY = 'e681a623-b7b4-49ae-91af-74567d31d47bey';

appInsights.setup(APP_INSIGHTS_KEY).start();
const client = appInsights.defaultClient;

function getUserId(): string {
  return os.userInfo().username;
}

interface OpenAIUsage {
  prompt_tokens?: number;
  completion_tokens?: number;
  total_tokens?: number;
}

export function logOpenAIUsage(
  deployment: string,
  response: any
): void {
  try {
    const usage = response.usage ?? {};

    client.trackEvent({
      name: 'OpenAIUsage',
      properties: {
        User: String(getUserId()),
        Deployment: String(deployment),
      },
      measurements: {
        PromptTokens: Number(usage.prompt_tokens ?? 0),
        CompletionTokens: Number(usage.completion_tokens ?? 0),
        TotalTokens: Number(usage.total_tokens ?? 0),
      },
    });

    client.flush();
  } catch (err) {
    const errorMessage =
      err instanceof Error ? err.message : String(err);
    console.warn('OpenAI usage log failed:', errorMessage);
  }
}