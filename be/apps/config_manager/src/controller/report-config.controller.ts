import { Body, Controller, Get, HttpCode, Put } from '@nestjs/common';
import { ApiBody, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ReportConfigService } from 'src/service/report-config.service';
import type {
  ReportConfigOutput,
  ReportConfigUpsertInput,
} from 'src/service/report-config.service';

type ApiResponse<T> = {
  success: true;
  data: T;
};

function ok<T>(data: T): ApiResponse<T> {
  return {
    success: true,
    data,
  };
}

@ApiTags('report-config')
@Controller('config/report')
export class ReportConfigController {
  constructor(
    private readonly reportConfigService: ReportConfigService,
  ) {}

  @Get()
  @HttpCode(200)
  @ApiOperation({ summary: '현재 리포트 설정(singleton)을 조회' })
  @ApiOkResponse({ description: '리포트 설정 1건 반환' })
  async getConfig(): Promise<ApiResponse<ReportConfigOutput>> {
    const result = await this.reportConfigService.getConfig();
    return ok(result);
  }

  @Put()
  @HttpCode(200)
  @ApiOperation({ summary: '현재 리포트 설정(singleton)을 저장/수정' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        subjectTemplate: {
          type: 'string',
          example: '[{eventId}]{summary}',
        },
        htmlTemplate: {
          type: 'string',
          example:
            '<div><p><strong>이슈 원인</strong></p><p>{summary}</p></div>',
        },
        description: {
          type: 'string',
          example: '기본 리포트 템플릿',
        },
        enabled: {
          type: 'boolean',
          example: true,
        },
      },
      required: ['subjectTemplate', 'htmlTemplate'],
    },
  })
  @ApiOkResponse({ description: '저장된 리포트 설정 반환' })
  async upsertConfig(
    @Body() body: ReportConfigUpsertInput,
  ): Promise<ApiResponse<ReportConfigOutput>> {
    const result = await this.reportConfigService.upsertConfig(body);
    return ok(result);
  }
}