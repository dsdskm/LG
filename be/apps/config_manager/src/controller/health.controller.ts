import { Controller, Get } from "@nestjs/common";
import { ApiOkResponse, ApiOperation, ApiTags } from "@nestjs/swagger";
import { HealthService } from "../service/health.service";

@ApiTags("health")
@Controller("health")
export class HealthController {
  constructor(private readonly healthService: HealthService) {}

  @Get()
  @ApiOperation({ summary: "서비스 헬스 상태를 조회" })
  @ApiOkResponse({ description: "헬스 체크 응답 반환" })
  check() {
    return this.healthService.check();
  }
}