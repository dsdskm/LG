import { Controller, Get, HttpCode, Post } from '@nestjs/common';
import { ok } from '@ai-log/shared-contracts';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { SimulatorService } from '../sim/simulator.service';

@ApiTags('event-generator')
@Controller('sim')
export class SimulatorController {
  constructor(private readonly sim: SimulatorService) {}

  /**
   * API: ROS2 robot_wanderer 동작을 흉내낸 연속 로그 시뮬레이션을 시작한다.
   * Method/Path: POST /sim/start
   * curl: curl -X POST 'http://localhost:9001/sim/start' -i
   */
  @Post('start')
  @HttpCode(200)
  @ApiOperation({ summary: '로봇 로그 시뮬레이션 시작 (연속 생성+전송)' })
  @ApiOkResponse({ description: '시뮬레이터 상태 반환' })
  start() {
    return ok(this.sim.start());
  }

  /**
   * API: 시뮬레이션을 중지하고 남은 로그를 flush 한다.
   * Method/Path: POST /sim/stop
   * curl: curl -X POST 'http://localhost:9001/sim/stop' -i
   */
  @Post('stop')
  @HttpCode(200)
  @ApiOperation({ summary: '로봇 로그 시뮬레이션 중지' })
  @ApiOkResponse({ description: '시뮬레이터 상태 반환' })
  async stop() {
    return ok(await this.sim.stop());
  }

  /**
   * API: 현재 시뮬레이터 상태 조회.
   * Method/Path: GET /sim/status
   */
  @Get('status')
  @ApiOperation({ summary: '시뮬레이터 상태 조회' })
  @ApiOkResponse({ description: '시뮬레이터 상태 반환' })
  status() {
    return ok(this.sim.status());
  }
}
