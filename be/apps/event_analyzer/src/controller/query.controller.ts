import { Controller, Get, Logger, Query } from '@nestjs/common';
import {
    ApiOkResponse,
    ApiOperation,
    ApiQuery,
    ApiTags,
} from '@nestjs/swagger';
import { okList } from '@ai-log/shared-contracts';
import { QueryService } from 'src/service/query.service';
import { parseQueryLogsParams } from 'src/query/query';

@ApiTags('query')
@Controller('query')
export class QueryController {
    constructor(private readonly queryService: QueryService) { }
    private readonly logger = new Logger(QueryController.name);
    /**
     * 통합 AI 로그 목록 조회
     *
     * 동작 규칙:
     * 1) status/start/end 만 있으면 receiver 기준 페이지네이션
     * 2) severity/func/summary 만 있으면 analyzer 기준 페이지네이션
     * 3) 둘 다 있으면 receiver에서 eventIds 전부 수집 -> analyzer에서 교집합 페이지네이션
     */
    @Get('logs')
    @ApiOperation({ summary: '이벤트/분석 통합 로그 목록 조회' })
    @ApiQuery({ name: 'start', required: false, example: '2026-05-01' })
    @ApiQuery({ name: 'end', required: false, example: '2026-05-30' })
    @ApiQuery({ name: 'status', required: false, example: 'prepared' })
    @ApiQuery({ name: 'severity', required: false, example: 'high' })
    @ApiQuery({ name: 'func', required: false, example: 'HW' })
    @ApiQuery({ name: 'summary', required: false, example: 'timeout' })
    @ApiQuery({ name: 'startIndex', required: false, example: 0 })
    @ApiQuery({ name: 'count', required: false, example: 10 })
    @ApiOkResponse({
        description:
            '통합 로그 목록 반환 { code, data: items[], pageInfo: { totalCount, count, index, hasNext } }',
    })
    async getLogs(@Query() rawQuery: Record<string, unknown>) {
        const params = parseQueryLogsParams(rawQuery);
        const ret = await this.queryService.getLogs(params);
        // 전체 본문 덤프 대신 결과 길이만
        this.logger.log(
            `getLogs length=${ret.items.length} totalCount=${ret.pageInfo.totalCount}`,
        );
        return okList(ret.items, ret.pageInfo)
    }
}