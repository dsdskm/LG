import { Module } from "@nestjs/common";
import { ReceiverService } from "./receiver/receiver.service";
import { ReceiverController } from "./receiver/receiver.controller";
import { McapParser } from "./utils/mcap.parser";
import { ApiClient } from "@ai-log/http-api";
import { AnalyzerApi } from "./api/analyzer.api";
import { TypeOrmModule } from "@nestjs/typeorm";
import { EventEntity } from "./db/event.entity";
import { DbService } from "./db/db.service";

@Module({

  imports: [
    TypeOrmModule.forRoot({
      type: "postgres",
      url: process.env.DB_URL_EVENT_RECEIVER,
      entities: [EventEntity],
      synchronize: true, // ✅ 개발단계만 (운영에서는 false + migration)
      logging: false,
    }),
    TypeOrmModule.forFeature([EventEntity]),
  ],
  controllers: [ReceiverController],
  providers: [ReceiverService, McapParser, ApiClient, AnalyzerApi, DbService],
})
export class AppModule { }
