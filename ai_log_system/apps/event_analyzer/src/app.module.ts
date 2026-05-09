import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";

import { AnalyzerController } from "./analyzer/analyzer.controller";
import { AnalyzerService } from "./analyzer/analyzer.service";

import { ApiClient } from "@ai-log/http-api";
import { LlmGatewayApi } from "./api/llm.api";
import { ReceiverApi } from "./api/receiver.api";

import { DbService } from "./db/db.service";
import { AnalyzerEntity } from "./db/analyzer.entity";

@Module({
  imports: [
    TypeOrmModule.forRoot({
      type: "postgres",
      url: process.env.DB_URL_EVENT_ANALYZER, // ✅ event_analyzer 전용 DB URL
      entities: [AnalyzerEntity],
      synchronize: true, // ✅ 개발단계만 (운영에서는 false + migration)
      logging: false,
    }),
    TypeOrmModule.forFeature([AnalyzerEntity]),
  ],
  controllers: [AnalyzerController],
  providers: [ApiClient, ReceiverApi, LlmGatewayApi, DbService, AnalyzerService],
})
export class AppModule { }