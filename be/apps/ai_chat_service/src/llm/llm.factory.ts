import { AzureLlmClient } from './azure/azure-llm.client';
import {
  assertAzureOpenaiConfig,
  loadAzureOpenaiConfig,
} from './azure/azure-openai.config';
import { VertexLlmClient } from './vertex/vertex-llm.client';
import {
  assertVertexConfig,
  loadVertexGeminiConfig,
} from './vertex/vertex-gemini.config';
import type { LlmProvider, LlmRuntime } from './llm.types';

export function getDefaultLlmProvider(provider: LlmProvider): LlmRuntime {
  if (provider === 'vertex') {
    const config = loadVertexGeminiConfig();

    return {
      provider,
      client: new VertexLlmClient(config),
      maxOutputTokens: config.defaultMaxOutputTokens,
      assertConfig: () => assertVertexConfig(config),
    };
  }

  const config = loadAzureOpenaiConfig();

  return {
    provider,
    client: new AzureLlmClient(config),
    maxOutputTokens: config.maxCompletionTokens,
    assertConfig: () => assertAzureOpenaiConfig(config),
  };
}