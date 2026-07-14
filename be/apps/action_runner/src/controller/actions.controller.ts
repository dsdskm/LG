import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  InternalServerErrorException,
  Logger,
  NotFoundException,
  Param,
  ParseIntPipe,
  Post,
  Put,
  Query,
} from "@nestjs/common";
import { ok } from "@ai-log/shared-contracts";
import {
  ApiBody,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import type { ActionInput } from '@ai-log/shared-contracts';
import { ActionsService } from "../service/actions.service";

@ApiTags('actions')
@Controller("actions")
export class ActionsController {
  private readonly logger = new Logger(ActionsController.name);

  constructor(private readonly actionsService: ActionsService) {}

  /**
   * API: action 목록을 조회한다.
   * Method/Path: GET /actions
   * Response: 200 { code: 200, data: ActionItem[] }
   * curl: curl -X GET 'http://localhost:3004/actions'
   */
  @Get()
  @HttpCode(200)
  @ApiOperation({ summary: 'action 목록을 조회 (func 지정 시 해당 기능에 사용 가능한 활성 액션만)' })
  @ApiQuery({ name: 'func', required: false, description: '지정 시 해당 func에 사용 가능한 enable 액션만 반환', example: 'navigation' })
  @ApiOkResponse({ description: 'action 목록 반환' })
  async listActions(@Query('func') func?: string): Promise<any> {
    const target = String(func ?? '').trim();
    const actions = target
      ? await this.actionsService.listActionsByFunc(target)
      : await this.actionsService.listActions();
    return ok(actions);
  }

  /**
   * API: action 단건을 ID로 조회한다.
   * Method/Path: GET /actions/:id
   * Response: 200 { code: 200, data: ActionItem }
   * curl: curl -X GET 'http://localhost:3004/actions/1'
   */
  @Get(":id")
  @HttpCode(200)
  @ApiOperation({ summary: 'ID로 action 단건을 조회' })
  @ApiParam({ name: 'id', example: 1 })
  @ApiOkResponse({ description: 'action 단건 반환' })
  async getAction(@Param("id", ParseIntPipe) id: number): Promise<any> {
    const row = await this.actionsService.getAction(id);
    if (!row) {
      throw new NotFoundException("action not found");
    }

    return ok(row);
  }

  /**
   * API: action을 생성한다.
   * Method/Path: POST /actions
   * Body: ActionInput
   * Response: 200 { code: 200, data: ActionItem }
  * curl: curl -X POST 'http://localhost:3004/actions' -H 'Content-Type: application/json' -d '{"key":"report-send","name":"리포트 전송","description":"리포트 API 호출","enable":true}' -i
   */
  @Post()
  @HttpCode(200)
  @ApiOperation({ summary: 'action을 생성' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        key: { type: 'string', example: 'report-send' },
        name: { type: 'string', example: '리포트 전송' },
        description: { type: 'string', example: '리포트 API 호출' },
        enable: { type: 'boolean', example: true },
        funcs: {
          type: 'array',
          items: { type: 'string' },
          description: '이 액션을 사용할 수 있는 기능(func) 키 목록. 비우면 모든 기능 공통.',
          example: ['navigation', 'battery'],
        },
      },
      required: ['key', 'name'],
    },
  })
  @ApiOkResponse({ description: '생성된 action 반환' })
  async createAction(@Body() body: ActionInput): Promise<any> {
    const row = await this.actionsService.createAction(body);
    return ok(row);
  }

  /**
   * API: action을 갱신한다.
   * Method/Path: PUT /actions/:id
   * Body: ActionInput
   * Response: 200 { code: 200, data: ActionItem }
  * curl: curl -X PUT 'http://localhost:3004/actions/1' -H 'Content-Type: application/json' -d '{"key":"report-send","name":"리포트 재전송","description":"retry","enable":false}' -i
   */
  @Put(":id")
  @HttpCode(200)
  @ApiOperation({ summary: 'action을 갱신' })
  @ApiParam({ name: 'id', example: 1 })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        key: { type: 'string', example: 'report-send' },
        name: { type: 'string', example: '리포트 재전송' },
        description: { type: 'string', example: 'retry' },
        enable: { type: 'boolean', example: false },
        funcs: {
          type: 'array',
          items: { type: 'string' },
          description: '이 액션을 사용할 수 있는 기능(func) 키 목록. 비우면 모든 기능 공통.',
          example: ['navigation', 'battery'],
        },
      },
      required: ['key', 'name'],
    },
  })
  @ApiOkResponse({ description: '갱신된 action 반환' })
  async updateAction(
    @Param("id", ParseIntPipe) id: number,
    @Body() body: ActionInput,
  ): Promise<any> {
    this.logger.log(`[action_runner] updateAction id=${id} body=${JSON.stringify(body)}`);
    const row = await this.actionsService.updateAction(id, body);
    if (!row) {
      throw new NotFoundException("action not found");
    }

    return ok(row);
  }

  /**
   * API: action을 삭제한다.
   * Method/Path: DELETE /actions/:id
   * Response: 200 { code: 200, data: { ok: true, id } }
   * curl: curl -X DELETE 'http://localhost:3004/actions/1' -i
   */
  @Delete(":id")
  @HttpCode(200)
  @ApiOperation({ summary: 'action을 삭제' })
  @ApiParam({ name: 'id', example: 1 })
  @ApiOkResponse({ description: '삭제 결과 반환' })
  async removeAction(@Param("id", ParseIntPipe) id: number): Promise<any> {
    const deleted = await this.actionsService.removeAction(id);
    if (!deleted) {
      throw new NotFoundException("action not found");
    }
    return ok({ ok: true, id });
  }

  /**
   * API: eventId를 report_manager로 전달한다.
   * Method/Path: POST /actions/events
   * Body: { "eventId": number }
   * Response: 200 { code: 200, data: { ok: true, eventId } }
   * curl: curl -X POST 'http://localhost:3004/actions/events' -H 'Content-Type: application/json' -d '{"eventId":1}' -i
   */
  @Post("events")
  @HttpCode(200)
  @ApiOperation({ summary: 'eventId를 report_manager로 전달' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        eventId: { type: 'number', example: 1 },
      },
      required: ['eventId'],
    },
  })
  @ApiOkResponse({ description: 'eventId relay 결과 반환' })
  async relayEvent(@Body() body: { eventId?: number }): Promise<any> {
    const eventId = Number(body?.eventId);
    if (!Number.isInteger(eventId) || eventId <= 0) {
      throw new BadRequestException("eventId는 양의 정수여야 합니다.");
    }

    try {
      await this.actionsService.relayEventId(eventId);
      return ok({ ok: true, eventId });
    } catch (error: any) {
      this.logger.error(
        `[action_runner] relay failed eventId=${eventId} err=${error?.message ?? String(error)}`,
      );
      throw new InternalServerErrorException("eventId relay 실패");
    }
  }

  /**
   * API: 추천 액션을 실행(현재 더미)하고 해당 이슈를 "조치 완료"로 전이한다.
   * Method/Path: POST /actions/run
   * Body: { "eventId": number, "key"?: string }
   * Response: 200 { code: 200, data: { ok, eventId, key?, status } }
   * curl: curl -X POST 'http://localhost:3004/actions/run' -H 'Content-Type: application/json' -d '{"eventId":1,"key":"restart_navigation"}' -i
   */
  @Post("run")
  @HttpCode(200)
  @ApiOperation({ summary: '추천 액션 실행(더미) 후 해당 이슈를 조치 완료 처리' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        eventId: { type: 'number', example: 1 },
        key: { type: 'string', example: 'restart_navigation' },
      },
      required: ['eventId'],
    },
  })
  @ApiOkResponse({ description: '실행 및 상태 전이 결과 반환' })
  async runAction(
    @Body() body: { eventId?: number; key?: string },
  ): Promise<any> {
    const eventId = Number(body?.eventId);
    if (!Number.isInteger(eventId) || eventId <= 0) {
      throw new BadRequestException("eventId는 양의 정수여야 합니다.");
    }

    try {
      const result = await this.actionsService.runAction(eventId, body?.key);
      return ok(result);
    } catch (error: any) {
      this.logger.error(
        `[action_runner] runAction failed eventId=${eventId} err=${error?.message ?? String(error)}`,
      );
      throw new InternalServerErrorException("액션 실행/상태 전이 실패");
    }
  }
}
