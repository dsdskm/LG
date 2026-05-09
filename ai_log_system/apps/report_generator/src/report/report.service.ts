import { Injectable, Logger } from '@nestjs/common';
import { DbService } from '../db/db.service';
import { ReceiverApi } from '../api/receiver.api';
import { LlmGatewayApi } from '../api/llm-gateway.api';
import { EventStatus, toKoreanTimeString } from '@ai-log/shared-contracts';
import type {
  ReportCreateRequest,
  ReportCreateResponse,
  ReportItem,
} from '@ai-log/shared-contracts';
import { AnalyzerApi } from 'src/api/analyzer.api';
import { SolutionApi } from 'src/api/solution.api';

@Injectable()
export class ReportService {
  private readonly logger = new Logger(ReportService.name);

  constructor(
    private readonly db: DbService,
    private readonly receiverApi: ReceiverApi,
    private readonly llmGatewayApi: LlmGatewayApi,
    private readonly analyzerApi: AnalyzerApi,
    private readonly solutionApi: SolutionApi,
  ) { }

  async generateReport(
    payload: ReportCreateRequest,
  ): Promise<ReportCreateResponse> {
    const eventId = Number(payload.eventId)
    const analyzerResult = await this.analyzerApi.getAnalysisSummary(
      eventId,
    );
    const solutionResult = await this.solutionApi.getSolutions(eventId);

    const summary = analyzerResult?.summary ?? '';
    const reason = analyzerResult?.reason ?? '';
    const solutions = solutionResult?.solutions ?? [];

    this.logger.log(`patchEventStatus -> eventId=${eventId} status=${EventStatus.REPORT_GENERATING}`);
    const generatingStatus = await this.receiverApi.patchEventStatus(
      eventId,
      EventStatus.REPORT_GENERATING,
    );
    this.logger.log(`patchEventStatus -> eventId=${eventId} status=${EventStatus.REPORT_GENERATING}`);

    const report = await this.llmGatewayApi.summarizeReport({
      eventId,
      summary,
      reason,
      solutions,
    });
    let reportId: number = 0
    let createdAt: string = ""
    if (report) {
      const entity = await this.db.saveReport(eventId, report);
      reportId = entity.id;
      createdAt = toKoreanTimeString(entity.createdAt)
      await this.receiverApi.patchEventStatus(
        eventId,
        EventStatus.REPORT_CREATED,
      );
    } else {
      await this.receiverApi.patchEventStatus(
        eventId,
        EventStatus.REPORT_FAILED,
      );
    }
    return {
      reportId: reportId,
      createdAt: createdAt,
      report,
    };

  }

  async fetchReports(): Promise<ReportItem[]> {
    const reports = await this.db.findAll();
    return reports.map((entity) => ({
      reportId: entity.id,
      eventId: entity.eventId ?? 0,
      report: entity.report,
      createdAt: toKoreanTimeString(entity.createdAt),
      updatedAt: toKoreanTimeString(entity.updatedAt),
    }));
  }

  async fetchReportByEventId(eventId: number): Promise<ReportItem | null> {
    const entity = await this.db.findByEventId(eventId);
    if (!entity) return null;
    return {
      reportId: entity.id,
      eventId: entity.eventId ?? 0,
      report: entity.report,
      createdAt: toKoreanTimeString(entity.createdAt),
      updatedAt: toKoreanTimeString(entity.updatedAt),
    };
  }
}
