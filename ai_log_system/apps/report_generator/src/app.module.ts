import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ReportEntity } from './db/report.entity';
import { DbService } from './db/db.service';
import { ReportService } from './report/report.service';
import { ReportController } from './report/report.controller';
import { ReceiverApi } from './api/receiver.api';
import { LlmGatewayApi } from './api/llm-gateway.api';
import { AnalyzerApi } from './api/analyzer.api';
import { SolutionApi } from './api/solution.api';
import { ApiClient } from '@ai-log/http-api';

@Module({
  imports: [
    TypeOrmModule.forRoot({
      type: 'postgres',
      url: process.env.DB_URL_REPORT_GENERATOR,
      entities: [ReportEntity],
      synchronize: true,
      logging: false,
    }),
    TypeOrmModule.forFeature([ReportEntity]),
  ],
  controllers: [ReportController],
  providers: [ReportService, DbService, ReceiverApi, LlmGatewayApi, AnalyzerApi, SolutionApi, ApiClient],
})
export class AppModule {}
