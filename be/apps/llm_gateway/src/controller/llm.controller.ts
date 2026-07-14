import { Body, Controller, Logger, Post, Res } from '@nestjs/common';
import type { Response } from 'express';

import {
  ok,
  type ApiResponse,
  type LlmPayload,
} from '@ai-log/shared-contracts';
import { ApiBody, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { LlmService } from '../service/llm.service';

@ApiTags('llm')
@Controller('llm')
export class LlmController {
  constructor(private readonly llmService: LlmService) {}
  private readonly logger = new Logger(LlmController.name);
  /**
   * API: LLM 로그 분석을 실행한다.
   * Method/Path: POST /llm/analyze/logs
   * Body: LlmPayload
   * Response: ApiResponse<unknown> with status code passthrough
   * curl: curl -X POST 'http://localhost:3003/llm/analyze/logs' -H 'Content-Type: application/json' -d '{"logs":[]}' -i
   */
  @Post('analyze/logs')
  @ApiOperation({ summary: 'LLM 로그 분석을 실행' })
  @ApiBody({
    schema: {
      type: 'object',
      description: 'LlmPayload',
      additionalProperties: true,
    },
  })
  @ApiOkResponse({ description: '분석 결과 반환(상태코드 passthrough)' })
  async analyzeLogs(
    @Body() body: LlmPayload,
    @Res({ passthrough: true }) res: Response,
  ): Promise<ApiResponse<unknown>> {
    const result = await this.llmService.analyzeLogs(body);
    res.status(result.status);
    return ok(result.body);
  }

  /**
   * API: Stage1 로그 분류(func + confidence)를 실행한다.
   * Method/Path: POST /llm/classify/logs
   * curl: curl -X POST 'http://localhost:3003/llm/classify/logs' -H 'Content-Type: application/json' -d '{"logs":[]}' -i
   */
  @Post('classify/logs')
  @ApiOperation({ summary: 'LLM 로그 분류(func/confidence)를 실행' })
  @ApiBody({
    schema: {
      type: 'object',
      description: 'LlmPayload',
      additionalProperties: true,
    },
  })
  @ApiOkResponse({ description: '분류 결과 반환(상태코드 passthrough)' })
  async classifyLogs(
    @Body() body: LlmPayload,
    @Res({ passthrough: true }) res: Response,
  ): Promise<ApiResponse<unknown>> {
    const result = await this.llmService.classifyLogs(body);
    res.status(result.status);
    return ok(result.body);
  }
}
