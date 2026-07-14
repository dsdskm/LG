import { Body, Controller, Get, Put } from "@nestjs/common";
import { ok } from "@ai-log/shared-contracts";
import {
  ApiBody,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from "@nestjs/swagger";
import { EventConfigService } from "../service/event-config.service";
import { UpdateErrorContextLinesDto } from "../dto/event-config.dto";

@Controller("config/event")
@ApiTags("event-config")
export class EventConfigController {
  constructor(private readonly eventConfigService: EventConfigService) {}

  @Get("error-context-lines")
  @ApiOperation({ summary: "errorContextLines 설정을 조회" })
  @ApiOkResponse({ description: "현재 errorContextLines 메타 반환" })
  async getErrorContextLines() {
    const meta = await this.eventConfigService.getErrorContextLinesMeta();
    return ok(meta);
  }

  @Put("error-context-lines")
  @ApiOperation({ summary: "errorContextLines 설정을 갱신" })
  @ApiBody({ type: UpdateErrorContextLinesDto })
  @ApiOkResponse({ description: "갱신된 errorContextLines 메타 반환" })
  async setErrorContextLines(@Body() body: UpdateErrorContextLinesDto) {
    const result = await this.eventConfigService.setErrorContextLinesFromInput(
      body?.errorContextLines,
      body?.updatedBy,
    );

    return ok({
      errorContextLines: Number(result.value),
      updatedBy: result.updatedBy ?? null,
      updatedAt: result.updatedAt,
    });
  }
}