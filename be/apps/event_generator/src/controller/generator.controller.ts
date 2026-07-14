import { Body, Controller, HttpCode, Post, Res } from '@nestjs/common';
import type { Response } from 'express';
import {
  ApiBody,
  ApiConsumes,
  ApiOkResponse,
  ApiOperation,
  ApiProduces,
  ApiTags,
} from '@nestjs/swagger';
import { SendBody } from '../dto/send-body.dto';
import { GeneratorService } from '../service/generator.service';

@ApiTags('event-generator')
@Controller()
export class GeneratorController {
  constructor(private readonly generatorService: GeneratorService) {}

  /**
   * API: 테스트 로그를 생성하고 event_receiver로 전송한다.
   * Method/Path: POST /send
   * Body: SendBody
   * Response: 200 (mcap binary) + x-batch-id/x-log-count/x-receiver-status
   * curl: curl -X POST 'http://localhost:9001/send' -H 'Content-Type: application/json' -d '{"durationMinutes":1,"logsPerSecond":30}' -i
   */
  @HttpCode(200)
  @Post('send')
  @ApiOperation({ summary: '테스트 로그를 생성하고 event_receiver로 전송' })
  @ApiConsumes('application/json')
  @ApiProduces('application/octet-stream')
  @ApiBody({ type: SendBody })
  @ApiOkResponse({
    description: 'MCAP 바이너리 반환 및 배치 메타 헤더 포함',
    schema: {
      type: 'string',
      format: 'binary',
    },
  })
  async send(@Body() body: SendBody, @Res() res: Response): Promise<void> {
    const result = await this.generatorService.handleSend(body);

    res.setHeader('Content-Type', 'application/octet-stream');
    res.setHeader('x-batch-id', result.meta.batchId);
    res.setHeader('x-log-count', String(result.meta.logCount));
    res.setHeader('x-receiver-status', String(result.meta.receiverStatus));

    if (result.meta.receiverJson !== undefined) {
      try {
        res.setHeader(
          'x-receiver-json',
          encodeURIComponent(JSON.stringify(result.meta.receiverJson)),
        );
      } catch {
        // ignore
      }
    }

    res.status(200).send(result.buffer);
  }
}
