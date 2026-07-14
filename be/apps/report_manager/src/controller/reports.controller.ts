import { BadRequestException, Body, Controller, Get, HttpCode, Param, ParseIntPipe, Post } from '@nestjs/common';
import { ok } from '@ai-log/shared-contracts';
import {
  ApiBody,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { ReportsService } from 'src/service/reports.service';

@ApiTags('reports')
@Controller('reports')
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) { }

  @HttpCode(200)
  @Get()
  @ApiOperation({ summary: '리포트 발송 이력 전체를 조회' })
  @ApiOkResponse({ description: '리포트 발송 이력 목록 반환' })
  async getHistory(): Promise<any> {
    const result = await this.reportsService.getHistoryAll();
    return ok(result);
  }

  @HttpCode(200)
  @Get()
  @ApiOperation({ summary: 'id로 리포트 발송 이력을 조회' })
  @ApiOkResponse({ description: '리포트 발송 이력 단건 반환' })
  async getHistoryById(@Param('id', ParseIntPipe) id: number): Promise<any> {
    const result = await this.reportsService.getHistoryById(id);
    return ok(result);
  }

  /**
   * API: eventId를 받아 실제 리포트 메일을 발송한다.
   * Method/Path: POST /reports/event-id
   * Body: { "eventId": number }
  * Response: 200 { code: 200, data: { ok, eventId, assignees, accepted, rejected } }
   * curl: curl -X POST 'http://localhost:3005/reports/event-id' -H 'Content-Type: application/json' -d '{"eventId":1}' -i
   */
  @HttpCode(200)
  @Post('event-forward')
  @ApiOperation({ summary: 'eventId 기준 리포트 메일을 발송' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        eventId: { type: 'number', example: 1 },
      },
      required: ['eventId'],
    },
  })
  @ApiOkResponse({ description: '메일 발송 결과 반환' })
  async receiveEventId(@Body() body: { eventId?: number }): Promise<any> {
    const eventId = Number(body?.eventId);
    if (!Number.isInteger(eventId) || eventId <= 0) {
      throw new BadRequestException('eventId는 양의 정수여야 합니다.');
    }

    const result = await this.reportsService.sendByEventId(eventId);
    return ok(result);
  }
}