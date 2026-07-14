import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
} from "@nestjs/common";
import { ok } from "@ai-log/shared-contracts";
import {
  ApiBody,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
} from "@nestjs/swagger";
import { FunConfigService } from "../service/fun-config.service";

type UpdateFunctionCatalogBody = {
  funcs?: string[] | string;
};

type CreateFuncBody = {
  func?: string;
  tags?: string[] | string;
  description?: string;
  prompt?: string;
  assignees?: string[] | string;
};

type UpdateFuncByIdBody = {
  func?: string;
  tags?: string[] | string;
  description?: string;
  prompt?: string;
  assignees?: string[] | string;
};

@Controller("config/fun")
@ApiTags("fun-config")
export class FunConfigController {
  constructor(private readonly funConfigService: FunConfigService) {}

  @Get()
  @ApiOperation({ summary: "func 목록을 조회" })
  @ApiOkResponse({ description: "func 목록 반환" })
  async getFunc() {
    try {
      const payload = await this.funConfigService.getFuncPayload();
      return ok(payload);
    } catch (e: any) {
      throw new BadRequestException(e?.message ?? "invalid request");
    }
  }

  @Put()
  @ApiOperation({ summary: "func 목록을 갱신" })
  @ApiBody({
    schema: {
      type: "object",
      properties: {
        funcs: {
          oneOf: [
            { type: "string" },
            { type: "array", items: { type: "string" } },
          ],
          example: ["네비게이션", "HW"],
        },
      },
    },
  })
  @ApiOkResponse({ description: "갱신된 func 목록 반환" })
  async setFunc(@Body() body: UpdateFunctionCatalogBody) {
    try {
      const payload = await this.funConfigService.setFuncPayload(body?.funcs ?? []);
      return ok(payload);
    } catch (e: any) {
      throw new BadRequestException(e?.message ?? "invalid request");
    }
  }

  @Post()
  @ApiOperation({ summary: "func를 생성" })
  @ApiBody({
    schema: {
      type: "object",
      properties: {
        func: { type: "string", example: "navigation" },
        description: { type: "string", example: "네비게이션 관련 처리" },
        prompt: { type: "string", example: "NAV 관련 로그는 navigation으로 분류" },
        tags: {
          oneOf: [
            { type: "string" },
            { type: "array", items: { type: "string" } },
          ],
          example: ["네비게이션", "HW"],
        },
        assignees: {
          oneOf: [
            { type: "string" },
            { type: "array", items: { type: "string" } },
          ],
          example: ["owner@example.com"],
        },
      },
      required: ["func"],
    },
  })
  @ApiOkResponse({ description: "생성된 func 반환" })
  async createFunc(@Body() body: CreateFuncBody) {
    try {
      const payload = await this.funConfigService.createFuncPayload(
        String(body?.func ?? ""),
        body?.tags,
        body?.description,
        body?.prompt,
        body?.assignees,
      );
      return ok(payload);
    } catch (e: any) {
      throw new BadRequestException(e?.message ?? "invalid request");
    }
  }

  @Get(":id")
  @ApiOperation({ summary: "id로 func를 조회" })
  @ApiParam({ name: "id", example: 1 })
  @ApiOkResponse({ description: "조회된 func 반환" })
  async getFuncById(@Param("id") id: string) {
    try {
      const payload = await this.funConfigService.getFuncByIdPayload(id);
      return ok(payload);
    } catch (e: any) {
      throw new BadRequestException(e?.message ?? "invalid request");
    }
  }

  @Put(":id")
  @ApiOperation({ summary: "id로 func를 수정" })
  @ApiParam({ name: "id", example: 1 })
  @ApiBody({
    schema: {
      type: "object",
      properties: {
        func: { type: "string", example: "navigation" },
        description: { type: "string", example: "네비게이션 관련 처리" },
        prompt: { type: "string", example: "NAV 관련 로그는 navigation으로 분류" },
        tags: {
          oneOf: [
            { type: "string" },
            { type: "array", items: { type: "string" } },
          ],
          example: ["네비게이션", "HW"],
        },
        assignees: {
          oneOf: [
            { type: "string" },
            { type: "array", items: { type: "string" } },
          ],
          example: ["owner@example.com"],
        },
      },
    },
  })
  @ApiOkResponse({ description: "수정된 func 반환" })
  async updateFuncById(@Param("id") id: string, @Body() body: UpdateFuncByIdBody) {
    try {
      const payload = await this.funConfigService.updateFuncByIdPayload(id, body);
      return ok(payload);
    } catch (e: any) {
      throw new BadRequestException(e?.message ?? "invalid request");
    }
  }

  @Delete(":id")
  @ApiOperation({ summary: "id로 func를 삭제" })
  @ApiParam({ name: "id", example: 1 })
  @ApiOkResponse({ description: "삭제 결과 반환" })
  async deleteFuncById(@Param("id") id: string) {
    try {
      const payload = await this.funConfigService.deleteFuncByIdPayload(id);
      return ok(payload);
    } catch (e: any) {
      throw new BadRequestException(e?.message ?? "invalid request");
    }
  }
}
