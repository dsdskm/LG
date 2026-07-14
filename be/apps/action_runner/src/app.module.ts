import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { ApiClient } from "@ai-log/http-api";
import { ActionsController } from "./controller/actions.controller";
import { ActionsService } from "./service/actions.service";
import { ReportManagerApi } from "./api/report-manager.api";
import { ReceiverApi } from "./api/receiver.api";
import { AdminDbController } from "./controller/admin-db.controller";
import { AdminDbService } from "./service/admin-db.service";
import { HealthController } from "./controller/health.controller";
import { HealthService } from "./service/health.service";
import { ActionEntity } from "./db/action.entity";

@Module({
  imports: [
    TypeOrmModule.forRoot({
      type: "postgres",
      url: process.env.DB_URL_ACTION_RUNNER,
      entities: [ActionEntity],
      synchronize: true,
      logging: false,
    }),
    TypeOrmModule.forFeature([ActionEntity]),
  ],
  controllers: [ActionsController, HealthController, AdminDbController],
  providers: [ApiClient, ReportManagerApi, ReceiverApi, ActionsService, HealthService, AdminDbService],
})
export class AppModule {}
