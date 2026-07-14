import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { EventConfigEntity } from "./db/event-config.entity";
import { LlmConfigEntity } from "./db/llm-config.entity";
import { FuncEntity } from "./db/func.entity";
import { EventConfigController } from "./controller/event-config.controller";
import { EventConfigService } from "./service/event-config.service";
import { LlmConfigController } from "./controller/llm-config.controller";
import { LlmConfigService } from "./service/llm-config.service";
import { FunConfigController } from "./controller/fun-config.controller";
import { FunConfigService } from "./service/fun-config.service";
import { HealthController } from "./controller/health.controller";
import { HealthService } from "./service/health.service";
import { AssigneeEntity } from "./db/assignee.entity";
import { AssigneesController } from "./controller/assignees.controller";
import { AssigneesService } from "./service/assignees.service";
import { ReportConfigEntity } from "./db/report-config.entity";
import { ReportConfigController } from "./controller/report-config.controller";
import { ReportConfigService } from "./service/report-config.service";
import { UiConfigController } from "./controller/ui-config.controller";
import { UiConfigService } from "./service/ui-config.service";
import { AdminDbController } from "./controller/admin-db.controller";
import { AdminDbService } from "./service/admin-db.service";

@Module({
  imports: [
    TypeOrmModule.forRoot({
      type: "postgres",
      url: process.env.DB_URL_CONFIG_MANAGER,
      entities: [
        EventConfigEntity,
        LlmConfigEntity,
        FuncEntity,
        AssigneeEntity,
        ReportConfigEntity,
      ],
      synchronize: true,
      logging: false,
    }),
    TypeOrmModule.forFeature([
      EventConfigEntity,
      LlmConfigEntity,
      FuncEntity,
      AssigneeEntity,
      ReportConfigEntity,
    ]),
  ],
  controllers: [
    EventConfigController,
    LlmConfigController,
    FunConfigController,
    HealthController,
    AssigneesController,
    ReportConfigController,
    UiConfigController,
    AdminDbController,
  ],
  providers: [
    EventConfigService,
    LlmConfigService,
    FunConfigService,
    HealthService,
    AssigneesService,
    ReportConfigService,
    UiConfigService,
    AdminDbService,
  ],
})
export class AppModule { }