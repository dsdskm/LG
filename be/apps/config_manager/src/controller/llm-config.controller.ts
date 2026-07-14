import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Logger,
  Param,
  Put,
} from '@nestjs/common';
import { ok } from '@ai-log/shared-contracts';
import {
  ApiBody,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
} from '@nestjs/swagger';
import { LlmConfigService } from '../service/llm-config.service';

type UpsertInstructionBody = {
  instruction?: string;
};

type UpdateActiveProviderBody = {
  provider?: string;
};

@Controller('config/llm')
@ApiTags('llm-config')
export class LlmConfigController {
  constructor(private readonly llmConfigService: LlmConfigService) {}
  private readonly logger = new Logger(LlmConfigController.name);
  @Get('provider')
  @ApiOperation({ summary: 'provider 설정 목록을 조회' })
  @ApiOkResponse({ description: 'provider 설정 목록 반환' })
  async getAll() {
    const rows = await this.llmConfigService.getAll();
    return ok(rows);
  }

  @Get('active-provider')
  @ApiOperation({ summary: '활성 provider를 조회' })
  @ApiOkResponse({ description: '활성 provider 반환' })
  async getActiveProvider() {
    try {
      const payload = await this.llmConfigService.getActiveProviderPayload();
      this.logger.log(`getActiveProvider payload=${JSON.stringify(payload)}`);
      return ok(payload);
    } catch (e: any) {
      throw new BadRequestException(e?.message ?? 'invalid request');
    }
  }

  @Put('active-provider')
  @ApiOperation({ summary: '활성 provider를 갱신' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        provider: { type: 'string', example: 'vertex' },
      },
      required: ['provider'],
    },
  })
  @ApiOkResponse({ description: '갱신된 활성 provider 반환' })
  async setActiveProvider(@Body() body: UpdateActiveProviderBody) {
    try {
      const payload = await this.llmConfigService.setActiveProviderPayload(
        String(body?.provider ?? ''),
      );
      this.logger.log(
        `setActiveProvider body=${JSON.stringify(body)} payload=${JSON.stringify(payload)}`,
      );
      return ok(payload);
    } catch (e: any) {
      throw new BadRequestException(e?.message ?? 'invalid request');
    }
  }

  @Get(':provider')
  @ApiOperation({ summary: 'provider 단건 설정을 조회' })
  @ApiParam({ name: 'provider', example: 'vertex' })
  @ApiOkResponse({ description: 'provider 단건 설정 반환' })
  async getOne(@Param('provider') provider: string) {
    try {
      const row = await this.llmConfigService.getProviderPayload(provider);
      this.logger.log(`getOne body=${provider} row=${JSON.stringify(row)}`);
      return ok(row);
    } catch (e: any) {
      if (String(e?.message ?? '').includes('not found')) {
        throw new BadRequestException('not found');
      }
      throw new BadRequestException(e?.message ?? 'invalid provider');
    }
  }

  @Put(':provider')
  @ApiOperation({ summary: 'provider 설정을 생성 또는 갱신' })
  @ApiParam({ name: 'provider', example: 'vertex' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        instruction: { type: 'string', example: 'new instruction' },
      },
      required: ['instruction'],
    },
  })
  @ApiOkResponse({ description: '생성/갱신된 provider 설정 반환' })
  async upsert(
    @Param('provider') provider: string,
    @Body() body: UpsertInstructionBody,
  ) {
    try {
      const row = await this.llmConfigService.upsertProviderPayload(
        provider,
        String(body?.instruction ?? ''),
      );
      this.logger.log(`upsert body=${JSON.stringify(body)} row=${JSON.stringify(row)}`);
      return ok(row);
    } catch (e: any) {
      throw new BadRequestException(e?.message ?? 'invalid request');
    }
  }
}
