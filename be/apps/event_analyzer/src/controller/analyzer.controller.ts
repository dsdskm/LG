import { Body, Controller, Get, Param, Patch, Post, Req, Res } from '@nestjs/common';
import type { Request, Response } from 'express';
import {
  ApiBody,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';

import { ok, okList, type AnalyzerPayload } from '@ai-log/shared-contracts';
import { AnalyzerService } from '../service/analyzer.service';
import { parseFetchAnalysisQuery } from 'src/analyzer.query';

@ApiTags('analysis')
@Controller('analysis')
export class AnalyzerController {
  constructor(private readonly analyzer: AnalyzerService) {}

  /**
   * API: 수신된 이벤트를 저장하고 분석 플로우를 비동기로 시작한다.
   * Method/Path: POST /analysis/event-forward
   * Body: AnalyzerPayload
   * Response: 202 Accepted | 204 No Content
   */
  @Post('event-forward')
  @ApiOperation({ summary: '이벤트를 수신하고 분석 파이프라인을 시작' })
  @ApiBody({
    schema: {
      type: 'object',
      description: 'AnalyzerPayload',
      additionalProperties: true,
    },
  })
  @ApiResponse({ status: 202, description: 'Accepted' })
  @ApiResponse({ status: 204, description: 'No Content' })
  async receive(@Body() body: AnalyzerPayload, @Res() res: Response): Promise<void> {
    const result = await this.analyzer.handleReceiveEvent(body);
    // ⚠ Express Response 객체를 return 하면 안 됨: 응답 인터셉터(kst-date)가 반환값에
    //   convertDatesDeep 를 적용하는데 Response 는 순환구조라 스택 초과를 유발한다.
    //   응답은 sendStatus 로 직접 보내고 핸들러는 void 를 반환한다.
    res.sendStatus(result.ingestStatus);
  }

  /**
   * API: 분석 결과 목록을 조건/페이지네이션으로 조회한다.
   * Method/Path:
   * GET /analysis?start=YYYY-MM-DD&end=YYYY-MM-DD&startIndex=0&count=100&eventIds=101,102&func=...&severity=...&summary=...
   *
   * Response:
   * 200 { code: 200, data: AnalysisItem[], pageInfo: { totalCount, count, index, hasNext } }
   */
  @Get()
  @ApiOperation({ summary: '분석 결과 목록을 조회' })
  @ApiQuery({ name: 'start', required: false, example: '2026-05-01' })
  @ApiQuery({ name: 'end', required: false, example: '2026-05-30' })
  @ApiQuery({ name: 'startIndex', required: false, example: 0 })
  @ApiQuery({ name: 'count', required: false, example: 50 })
  @ApiQuery({
    name: 'eventIds',
    required: false,
    example: '101,102',
    description: '쉼표로 구분된 이벤트 ID 목록',
  })
  @ApiQuery({ name: 'func', required: false, example: 'HW' })
  @ApiQuery({ name: 'severity', required: false, example: 'high' })
  @ApiQuery({ name: 'summary', required: false, example: 'timeout' })
  @ApiOkResponse({ description: '분석 결과 목록과 페이지 정보 반환' })
  async getAllAnalysis(@Req() req: Request) {
    const params = parseFetchAnalysisQuery(
      req.query as Record<string, unknown>,
    );
    const ret = await this.analyzer.fetchAnalysis(params);
    return okList(ret.items, ret.pageInfo);
  }

  /**
   * API: 특정 이벤트의 분석 요약을 조회한다.
   * Method/Path: GET /analysis/:eventId
   * Response: 200 { code: 200, data: { summary?, reason?, solutions?, func?, severity?, service? } }
   */
  @Get('/:eventId')
  @ApiOperation({ summary: 'eventId 기준 분석 결과를 조회' })
  @ApiParam({ name: 'eventId', example: '101' })
  @ApiOkResponse({ description: '분석 단건 반환' })
  async getAnalysis(@Param('eventId') eventId: string) {
    const result = await this.analyzer.getAnalysisByEventIdParam(eventId);
    return ok(result);
  }

  /**
   * API: 분석 결과(심각도/Function/분류점수/요약/원인/솔루션)를 수동 수정한다.
   * Method/Path: PATCH /analysis/:eventId
   * Body: { summary?, reason?, solutions?, func?, severity?, confidence? } (제공된 필드만 갱신)
   */
  @Patch('/:eventId')
  @ApiOperation({ summary: 'eventId 기준 분석 결과를 수동 수정' })
  @ApiParam({ name: 'eventId', example: '101' })
  @ApiBody({
    schema: {
      type: 'object',
      additionalProperties: true,
      description: '{ summary?, reason?, solutions?, func?, severity?, confidence? }',
    },
  })
  @ApiOkResponse({ description: '수정 결과 { ok }' })
  async updateAnalysis(
    @Param('eventId') eventId: string,
    @Body()
    body: {
      summary?: unknown;
      reason?: unknown;
      solutions?: unknown;
      func?: unknown;
      severity?: unknown;
      confidence?: unknown;
    },
  ) {
    const result = await this.analyzer.updateAnalysisByEventId(eventId, body);
    return ok(result);
  }
}
