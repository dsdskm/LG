import { Injectable, Logger } from '@nestjs/common';
import { type ApiResponse, type LlmPayload } from '@ai-log/shared-contracts';
import { VertexGeminiService } from './vertex/vertex-gemini.service';
import { AzureOpenaiService } from './azure/azure-openai.service';
import { ConfigManagerApi } from '../api/config-manager.api';

type LlmAnalyzeResponse = {
  status: number;
  body: ApiResponse<unknown>;
};

@Injectable()
export class LlmService {
  private readonly logger = new Logger(LlmService.name);

  constructor(
    private readonly vertex: VertexGeminiService,
    private readonly azure: AzureOpenaiService,
    private readonly configManagerApi: ConfigManagerApi,
  ) {}

  async analyzeLogs(body: LlmPayload): Promise<LlmAnalyzeResponse> {
    this.logger.log('[llm_gateway] analyzeLogs received');

    const provider = await this.configManagerApi.getActiveProvider();
    const useMock = provider === 'mock';

    if (provider === 'off') {
      const offResult = {
        elapsedMs: 0,
        service: 'off',
        off: true,
        request: { logCount: Array.isArray(body?.logs) ? body.logs.length : 0 },
        text: '',
        raw: null,
      };

      return {
        status: 200,
        body: {
          code: 200,
          data: offResult,
        },
      };
    }

    const result = useMock
      ? await this.vertex.mockAnalyzeLogs(body)
      : provider === 'azure'
        ? await this.azure.analyzeLogs(body)
        : await this.vertex.analyzeLogs(body);

    const status = Number(result?.status ?? 500);
    if (status >= 200 && status < 300) {
      return {
        status,
        body: {
          code: status,
          data: result,
        },
      };
    }

    return {
      status,
      body: {
        code: status,
        data: result,
      },
    };
  }

  /** Stage1: 로그를 func로 분류하고 confidence 산출 */
  async classifyLogs(body: LlmPayload): Promise<LlmAnalyzeResponse> {
    this.logger.log('[llm_gateway] classifyLogs received');

    const provider = await this.configManagerApi.getActiveProvider();

    if (provider === 'off') {
      return {
        status: 200,
        body: {
          code: 200,
          data: {
            off: true,
            service: 'off',
            func: '',
            confidence: 0,
            reason: '',
          },
        },
      };
    }

    const result =
      provider === 'mock'
        ? await this.vertex.mockClassifyLogs(body)
        : provider === 'azure'
          ? await this.azure.classifyLogs(body)
          : await this.vertex.classifyLogs(body);

    const status = Number(result?.status ?? 500);
    return {
      status,
      body: {
        code: status,
        data: result,
      },
    };
  }
}
