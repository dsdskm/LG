import { Module } from "@nestjs/common";
import { LlmController } from "./controller/llm.controller";
import { ApiClient } from "@ai-log/http-api";
import { ConfigManagerApi } from "./api/config-manager.api";
import { HealthController } from "./controller/health.controller";
import { HealthService } from "./service/health.service";
import { LlmService } from "./service/llm.service";
import { VertexGeminiService } from "./service/vertex/vertex-gemini.service";
import { AzureOpenaiService } from "./service/azure/azure-openai.service";

@Module({
  imports: [],
  controllers: [
    LlmController,
    HealthController,
  ],
  providers: [
    VertexGeminiService,
    AzureOpenaiService,
    LlmService,
    ConfigManagerApi,
    ApiClient,
    HealthService,
  ],
})
export class AppModule { }