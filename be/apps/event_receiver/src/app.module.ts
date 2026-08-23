import { Module } from "@nestjs/common";
import { ReceiverService } from "./service/receiver.service";
import { ReceiverController } from "./controller/receiver.controller";
import { McapParser } from "./utils/mcap.parser";
import { ApiClient } from "@ai-log/http-api";
import { AnalyzerApi } from "./api/analyzer.api";
import { ConfigManagerApi } from "./api/config-manager.api";
import { TypeOrmModule } from "@nestjs/typeorm";
import { EventEntity } from "./db/event.entity";
import { DbService } from "./db/db.service";
import { HealthController } from "./controller/health.controller";
import { HealthService } from "./service/health.service";
import { AdminDbController } from "./controller/admin-db.controller";
import { AdminDbService } from "./service/admin-db.service";

@Module({

  imports: [
    TypeOrmModule.forRoot({
      type: "postgres",
      url: process.env.DB_URL_EVENT_RECEIVER,
      entities: [EventEntity],
      synchronize: false,
      logging: false,
    }),
    TypeOrmModule.forFeature([EventEntity]),
  ],
  controllers: [ReceiverController, HealthController, AdminDbController],
  providers: [
    ReceiverService,
    McapParser,
    ApiClient,
    AnalyzerApi,
    ConfigManagerApi,
    DbService,
    HealthService,
    AdminDbService,
  ],
})
export class AppModule { }
