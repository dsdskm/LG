import { Module } from "@nestjs/common";
import { LlmController } from "./llm/llm.controller";
import { VertexGeminiService } from "./llm/vertex/vertex-gemini.service";
import { AzureOpenaiService } from "./llm/azure/azure-openai.service";
import { ApiClient } from "@ai-log/http-api";

@Module({
  controllers: [LlmController],
  providers: [VertexGeminiService, AzureOpenaiService, ApiClient],
})
export class AppModule { }