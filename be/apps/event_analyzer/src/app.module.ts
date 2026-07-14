import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";

import { AnalyzerController } from "./controller/analyzer.controller";
import { AnalyzerService } from "./service/analyzer.service";

import { ApiClient } from "@ai-log/http-api";
import { LlmGatewayApi } from "./api/llm.api";
import { ReceiverApi } from "./api/receiver.api";
import { ActionRunnerApi } from "./api/action-runner.api";

import { DbService } from "./db/db.service";
import { AnalyzerEntity } from "./db/analyzer.entity";
import { HealthController } from "./controller/health.controller";
import { HealthService } from "./service/health.service";
import { QueryController } from "./controller/query.controller";
import { QueryService } from "./service/query.service";
import { AdminDbController } from "./controller/admin-db.controller";
import { AdminDbService } from "./service/admin-db.service";

@Module({
  imports: [
    TypeOrmModule.forRoot({
      type: "postgres",
      url: process.env.DB_URL_EVENT_ANALYZER, 
      entities: [AnalyzerEntity],
      synchronize: true, 
      logging: false,
    }),
    TypeOrmModule.forFeature([AnalyzerEntity]),
  ],
  controllers: [AnalyzerController, HealthController, QueryController, AdminDbController],
  providers: [
    ApiClient,
    ReceiverApi,
    LlmGatewayApi,
    ActionRunnerApi,
    DbService,
    AnalyzerService,
    HealthService,
    QueryService,
    AdminDbService
  ],
})
export class AppModule { }