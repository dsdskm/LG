import { Body, Controller, Delete, Get, HttpCode, Param, ParseIntPipe, Put } from "@nestjs/common";
import {
  ok,
  type Assignee,
  type ApiResponse,
  type AssigneesInput,
} from "@ai-log/shared-contracts";
import {
  ApiBody,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
} from "@nestjs/swagger";
import { AssigneesService } from "../service/assignees.service";

@ApiTags("assignees")
@Controller("config/assignees")
export class AssigneesController {
  constructor(private readonly assigneesService: AssigneesService) {}

 
  @Get()
  @HttpCode(200)
  @ApiOperation({ summary: "전체 담당자 목록을 조회" })
  @ApiOkResponse({ description: "전체 담당자 목록 반환" })
  async getAll(): Promise<ApiResponse<Assignee[]>> {
    const result = await this.assigneesService.getAll();
    return ok(result);
  }


  @Get("id/:id")
  @HttpCode(200)
  @ApiOperation({ summary: "id로 담당자 단건을 조회" })
  @ApiParam({ name: "id", example: 1 })
  @ApiOkResponse({ description: "담당자 단건 반환" })
  async getById(
    @Param("id", ParseIntPipe) id: number,
  ): Promise<ApiResponse<Assignee>> {
    const result = await this.assigneesService.getById(id);
    return ok(result);
  }

  @Get("team/:team")
  @HttpCode(200)
  @ApiOperation({ summary: "team별 담당자 목록을 조회" })
  @ApiParam({ name: "team", example: "Platform" })
  @ApiOkResponse({ description: "team별 담당자 목록 반환" })
  async getByTeam(
    @Param("team") team: string,
  ): Promise<ApiResponse<Assignee[]>> {
    const result = await this.assigneesService.getByTeam(team);
    return ok(result);
  }

  @Get("funcs/:func")
  @HttpCode(200)
  @ApiOperation({ summary: "특정 FUNC의 담당자 목록을 조회" })
  @ApiParam({ name: "func", example: "PAYMENT_APPROVAL" })
  @ApiOkResponse({ description: "FUNC별 담당자 목록 반환" })
  async getFunc(@Param("func") func: string): Promise<ApiResponse<Assignee[]>> {
    const result = await this.assigneesService.getFunc(func);
    return ok(result);
  }

  @Put("funcs/:func")
  @HttpCode(200)
  @ApiOperation({ summary: "특정 FUNC의 담당자 목록을 저장" })
  @ApiParam({ name: "func", example: "PAYMENT_APPROVAL" })
  @ApiBody({
    schema: {
      type: "object",
      description: "AssigneesInput",
      properties: {
        assignees: {
          type: "array",
          items: {
            type: "object",
            properties: {
              email: { type: "string", example: "owner@example.com" },
              name: { type: "string", example: "Owner Kim" },
              team: { type: "string", example: "Platform" },
              profile: { type: "string", example: "L3 Oncall" },
              tags: {
                type: "array",
                items: { type: "string" },
                example: ["oncall", "backend"],
              },
            },
            required: ["email", "name", "team", "profile", "tags"],
          },
        },
      },
      required: ["assignees"],
    },
  })
  @ApiOkResponse({ description: "저장된 FUNC별 담당자 목록 반환" })
  async putFunc(
    @Param("func") func: string,
    @Body() body: AssigneesInput,
  ): Promise<ApiResponse<Assignee>> {
    const result = await this.assigneesService.putFunc(func, body);
    return ok(result);
  }

  @Delete("funcs/:func")
  @HttpCode(200)
  @ApiOperation({ summary: "특정 FUNC 담당자 설정을 삭제" })
  @ApiParam({ name: "func", example: "PAYMENT_APPROVAL" })
  @ApiOkResponse({ description: "삭제 결과 반환" })
  async deleteFunc(@Param("func") func: string): Promise<ApiResponse<{ message: string }>> {
    const result = await this.assigneesService.deleteFunc(func);
    return ok(result);
  }
}