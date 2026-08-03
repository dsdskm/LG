import {
  BadRequestException,
  Body,
  Controller,
  Get,
  HttpCode,
  InternalServerErrorException,
  Logger,
  Param,
  Patch,
  Post,
  Req,
} from '@nestjs/common';
import { ok, okList } from '@ai-log/shared-contracts';
import type { Request } from 'express';
import {
  ApiBody,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { ReceiverService } from 'src/service/receiver.service';
import { parseFetchEventsQuery } from 'src/receiver.query';

@ApiTags('event-receiver')
@Controller('events')
export class ReceiverController {
  constructor(private readonly svc: ReceiverService) { }
  private readonly logger = new Logger(ReceiverController.name);
  /**
   * API: mcap 바이너리를 수신하고 파싱/적재를 비동기로 시작한다.
   * Method/Path: POST /events/ingest/mcap
   * Body: application/octet-stream (mcap binary)
   * Response: 200 { code: 200, data: { ingestStatus: 202 | 204 } }
   * curl: curl -X POST 'http://localhost:3001/events/ingest/mcap' -H 'Content-Type: application/octet-stream' --data-binary '@/tmp/sample.mcap' -i
   */
  @Post('ingest/mcap')
  @HttpCode(200)
  @ApiOperation({ summary: 'MCAP 바이너리를 수신하고 적재를 비동기로 시작' })
  @ApiBody({
    description: 'application/octet-stream 형식의 MCAP 파일 바이너리',
    required: true,
    schema: { type: 'string', format: 'binary' },
  })
  @ApiOkResponse({
    description: '수신 후 내부 적재 시작 상태 반환',
  })
  async ingestMcap(@Req() req: Request) {
    const buf = req.body as Buffer;
    const status = await this.svc.handleMcapBuffer(buf);
    if (status === 400) {
      throw new BadRequestException('invalid mcap payload');
    }
    if (status >= 500) {
      throw new InternalServerErrorException('ingest failed');
    }

    return ok({ ingestStatus: status });
  }

  /**
   * API: 이벤트 상태를 갱신하고 Firestore 트리거 시각을 업데이트한다.
   * Method/Path: PATCH /events/:id/status
   * Body: { "status": string }
   * Response: 200 { code: 200, data: null }
   * curl: curl -X PATCH 'http://localhost:3001/events/123/status' -H 'Content-Type: application/json' -d '{"status":"DONE"}' -i
   */
  @Patch(['/:id/status'])
  @ApiOperation({ summary: '이벤트 상태를 갱신' })
  @ApiParam({ name: 'id', description: '이벤트 ID', example: '123' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        status: { type: 'string', example: 'DONE' },
      },
      required: ['status'],
    },
  })
  @ApiOkResponse({ description: '상태 갱신 완료' })
  async updateEventStatus(
    @Param('id') id: string,
    @Body() body: { status: string },
  ) {
    const eventId = Number(id);
    const status = body?.status?.trim() ?? '';
    await this.svc.updateEventStatusAndTrigger(eventId, status);
    return ok(null);
  }

  /**
   * API: 이벤트 목록을 페이지네이션으로 조회한다.
   * Method/Path: GET /events?start=YYYY-MM-DD&end=YYYY-MM-DD&startIndex=0&count=50&status=...&eventIds=101,102
   * Response: 200 { code: 200, data: EventPayload[], pageInfo: { totalCount, count, index, hasNext } }
   * curl: curl -X GET 'http://localhost:3001/events?start=2026-05-01&end=2026-05-30&startIndex=0&count=50&status=PREPARED&eventIds=101,102'
   */
  @Get()
  @ApiOperation({ summary: '이벤트 목록을 조회' })
  @ApiQuery({ name: 'start', required: false, example: '2026-05-01' })
  @ApiQuery({ name: 'end', required: false, example: '2026-05-30' })
  @ApiQuery({ name: 'startIndex', required: false, example: 0 })
  @ApiQuery({ name: 'count', required: false, example: 50 })
  @ApiQuery({ name: 'status', required: false, example: 'PREPARED' })
  @ApiQuery({
    name: 'eventIds',
    required: false,
    example: '101,102',
    description: '쉼표로 구분된 이벤트 ID 목록',
  })
  @ApiOkResponse({ description: '페이지네이션 이벤트 목록 반환' })
  async getAllEvents(@Req() req: Request) {
    const params = parseFetchEventsQuery(req.query as Record<string, unknown>);
    const ret = await this.svc.fetchEvents(params);
    return okList(ret.items, ret.pageInfo);
  }

  /**
   * API: 단건 이벤트를 ID로 조회한다.
   * Method/Path: GET /events/:id
   * Response: 200 { code: 200, data: EventPayload | null }
   * curl: curl -X GET 'http://localhost:3001/events/123'
   */
  @Get('/:id')
  @ApiOperation({ summary: 'ID로 이벤트 단건을 조회' })
  @ApiParam({ name: 'id', description: '이벤트 ID', example: '123' })
  @ApiOkResponse({ description: '이벤트 단건 조회 결과 반환' })
  async getEventById(@Param('id') id: string) {
    const event = await this.svc.fetchEventByIdFromParam(id);
    this.logger.log(`getEventById id ${id}`)
    return ok(event);
  }

  /**
   * API: 단건 이벤트의 createdAt/updatedAt 시각을 강제로 덮어쓴다. (mock 데이터 생성용)
   * Method/Path: PATCH /events/:id/timestamp
   * Body: { "at": "2026-08-01T10:20:30.000Z" }
   */
  @Patch('/:id/timestamp')
  @ApiOperation({ summary: '이벤트 단건의 타임스탬프를 강제로 갱신 (mock 용)' })
  @ApiParam({ name: 'id', description: '이벤트 ID', example: '123' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        at: { type: 'string', example: '2026-08-01T10:20:30.000Z' },
      },
      required: ['at'],
    },
  })
  @ApiOkResponse({ description: '타임스탬프 갱신 결과 반환' })
  async overrideEventTimestamp(
    @Param('id') id: string,
    @Body() body: { at?: unknown },
  ) {
    const result = await this.svc.overrideEventTimestampFromParam(id, body?.at);
    return ok(result);
  }
}