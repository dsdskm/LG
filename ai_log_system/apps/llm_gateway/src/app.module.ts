import { Module } from "@nestjs/common";
import { LlmController } from "./llm/llm.controller";
import { VertexGeminiService } from "./llm/vertex/vertex-gemini.service";
import { OllamaService } from "./llm/ollama/ollama.service";
import { AzureOpenaiService } from "./llm/azure/azure-openai.service";
import { ReceiverApi } from "./api/receiver.api";
import { ApiClient } from "@ai-log/http-api";

@Module({
  controllers: [LlmController],
  providers: [VertexGeminiService, OllamaService, AzureOpenaiService, ReceiverApi, ApiClient],
})
export class AppModule { }