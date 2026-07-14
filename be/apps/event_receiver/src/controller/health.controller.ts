import { Controller, Get } from "@nestjs/common";
import { ok } from "@ai-log/shared-contracts";
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { HealthService } from "src/service/health.service";

@ApiTags('health')
@Controller("health")
export class HealthController {
  constructor(private readonly healthService: HealthService) {}

  /**
   * API: 서비스 헬스 상태를 조회한다.
   * Method/Path: GET /health
   * Response: 200 { code: 200, data: { ok: true } }
   * curl: curl -X GET 'http://localhost:3001/health'
   */
  @Get()
  @ApiOperation({ summary: '서비스 헬스 상태를 조회' })
  @ApiOkResponse({ description: '헬스 체크 응답 반환' })
  check() {
    return ok(this.healthService.check());
  }
}