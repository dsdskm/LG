import { Body, Controller, Get, Param, Put } from "@nestjs/common";
import { ok } from "@ai-log/shared-contracts";
import { ApiOkResponse, ApiOperation, ApiParam, ApiTags } from "@nestjs/swagger";
import { UiConfigService } from "../service/ui-config.service";

type UpsertUiConfigBody = {
  value?: unknown;
  updatedBy?: string;
};

@Controller("config/ui")
@ApiTags("ui-config")
export class UiConfigController {
  constructor(private readonly uiConfigService: UiConfigService) {}

  @Get()
  @ApiOperation({ summary: "프론트 도메인 상수(UI config) 전체 조회" })
  @ApiOkResponse({ description: "모든 UI 상수 일괄 반환" })
  async getAll() {
    const payload = await this.uiConfigService.getAll();
    return ok(payload);
  }

  @Get(":key")
  @ApiOperation({ summary: "UI config 단건 조회" })
  @ApiParam({ name: "key", example: "status_labels" })
  @ApiOkResponse({ description: "단일 UI 상수 반환" })
  async getOne(@Param("key") key: string) {
    const value = await this.uiConfigService.getOne(key);
    return ok({ key, value });
  }

  @Put(":key")
  @ApiOperation({ summary: "UI config 단건 갱신" })
  @ApiParam({ name: "key", example: "status_labels" })
  @ApiOkResponse({ description: "갱신된 UI 상수 반환" })
  async upsert(@Param("key") key: string, @Body() body: UpsertUiConfigBody) {
    const result = await this.uiConfigService.upsert(
      key,
      body?.value,
      body?.updatedBy,
    );
    return ok(result);
  }
}
