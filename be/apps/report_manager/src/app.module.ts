import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ReportsController } from './controller/reports.controller';
import { ReportsService } from './service/reports.service';
import { ReceiverEventEntity } from './reports/entities/receiver-event.entity';
import { AnalyzerResultEntity } from './reports/entities/analyzer-result.entity';
import { HealthController } from './controller/health.controller';
import { HealthService } from './service/health.service';
import { ApiClient } from '@ai-log/http-api';
import { ConfigManagerApi } from './api/config-manager.api';
import { ReportSendHistoryEntity } from './db/report';
import { AdminDbController } from './controller/admin-db.controller';
import { AdminDbService } from './service/admin-db.service';

@Module({
  imports: [
    TypeOrmModule.forRoot({
      name: 'eventReceiverReadDb',
      type: 'postgres',
      url: process.env.DB_URL_EVENT_RECEIVER,
      entities: [ReceiverEventEntity],
      // read 전용: 소유 앱(event_receiver)이 스키마를 관리한다.
      // synchronize를 켜면 ReceiverEventEntity에 없는 full_log 컬럼이 drop됨.
      synchronize: true,
      logging: false,
    }),
    TypeOrmModule.forRoot({
      name: 'eventAnalyzerReadDb',
      type: 'postgres',
      url: process.env.DB_URL_EVENT_ANALYZER,
      entities: [AnalyzerResultEntity],
      // read 전용: 소유 앱(event_analyzer)이 스키마를 관리한다.
      synchronize: true,
      logging: false,
    }),
    TypeOrmModule.forRoot({
      name: 'reportManagerDb',
      type: 'postgres',
      url: process.env.DB_URL_REPORT_MANAGER,
      entities: [ReportSendHistoryEntity],
      synchronize: true,
      logging: false,
    }),
    TypeOrmModule.forFeature([ReceiverEventEntity], 'eventReceiverReadDb'),
    TypeOrmModule.forFeature([AnalyzerResultEntity], 'eventAnalyzerReadDb'),
    TypeOrmModule.forFeature([ReportSendHistoryEntity], 'reportManagerDb'),
  ],
  controllers: [ReportsController, HealthController, AdminDbController],
  providers: [ReportsService, HealthService, ApiClient, ConfigManagerApi, AdminDbService],
})
export class AppModule { }
