import { Body, Controller, Get, Logger, Param, Post } from '@nestjs/common';
import type { ReportCreateRequest, ReportCreateResponse, ReportItem } from '@ai-log/shared-contracts';
import { ReportService } from './report.service';

@Controller('reports')
export class ReportController {
  private readonly logger = new Logger(ReportController.name);

  constructor(private readonly reportService: ReportService) {}

  @Post()
  async createReport(@Body() body: ReportCreateRequest): Promise<ReportCreateResponse> {
    this.logger.log(`createReport received eventId=${body.eventId}`);
    return this.reportService.generateReport(body);
  }

  @Get()
  async getReports(): Promise<ReportItem[]> {
    this.logger.log('getReports received');
    return this.reportService.fetchReports();
  }

  @Get('event/:eventId')
  async getReportByEventId(@Param('eventId') eventId: string): Promise<ReportItem | null> {
    const numericEventId = Number(eventId);
    if (!Number.isInteger(numericEventId) || numericEventId <= 0) return null;
    return this.reportService.fetchReportByEventId(numericEventId);
  }
}
