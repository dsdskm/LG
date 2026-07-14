import { Module } from "@nestjs/common";
import { GeneratorController } from "./controller/generator.controller";
import { GeneratorService } from "./service/generator.service";
import { HealthController } from "./controller/health.controller";
import { HealthService } from "./service/health.service";
import { SimulatorController } from "./controller/simulator.controller";
import { SimulatorService } from "./sim/simulator.service";

@Module({
  controllers: [GeneratorController, HealthController, SimulatorController],
  providers: [GeneratorService, HealthService, SimulatorService],
})
export class AppModule { }
