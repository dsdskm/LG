// apps/llm_gateway/src/llm/llm.controller.ts
import { Body, Controller, Logger, Post, Res } from '@nestjs/common';
import { VertexGeminiService } from './vertex/vertex-gemini.service';
import { OllamaService } from './ollama/ollama.service';
import { AzureOpenaiService } from './azure/azure-openai.service';
import type { Response } from 'express';
import type { LlmPayload, ReportSummaryRequest } from '@ai-log/shared-contracts';

@Controller('llm')
export class LlmController {
  private readonly logger = new Logger(LlmController.name);
  constructor(
    private readonly vertex: VertexGeminiService,
    private readonly ollama: OllamaService,
    private readonly azure: AzureOpenaiService,
  ) {}

  @Post('analyze/logs')
  async analyzeLogs(@Body() body: LlmPayload, @Res() res: Response) {
    this.logger.log(`[llm_gateway] analyzeLogs received`);
    // const result = await this.azure.analyzeLogs(body);
    const result = await this.vertex.analyzeLogs(body);
    const status = Number(result?.status ?? 500);
    return res.status(status).json(result);
  }

  @Post('summarize/report')
  async summarizeReport(@Body() body: ReportSummaryRequest, @Res() res: Response) {
    this.logger.log(`[llm_gateway] summarizeReport received`);
    // const report = await this.ollama.summarizeReport(body);
    const report="준비중입니다."
    return res.status(200).json({ text: report });
  }
}
