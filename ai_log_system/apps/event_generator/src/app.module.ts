import { Module } from "@nestjs/common";
import { GeneratorController } from "./generator/generator.controller";
import { GeneratorService } from "./generator/generator.service";

@Module({
  controllers: [GeneratorController],
  providers: [GeneratorService],
})
export class AppModule { }
