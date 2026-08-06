import "dotenv/config";
import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module";
import { Logger } from "@nestjs/common";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";
import { KstDateInterceptor } from "./common/kst-date.interceptor";

async function bootstrap() {
  const logger = new Logger("Main");
  const app = await NestFactory.create(AppModule);
  app.useGlobalInterceptors(new KstDateInterceptor());

  const swaggerConfig = new DocumentBuilder()
    .setTitle("event_analyzer API")
    .setDescription("Auto-generated API docs for event_analyzer")
    .setVersion("1.0.0")
    .build();
  const swaggerDocument = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup("docs", app, swaggerDocument, {
    jsonDocumentUrl: "docs-json",
    yamlDocumentUrl: "docs-yaml",
  });

  app.enableCors({ origin: true, credentials: true });

  const port = Number(process.env.PORT_EVENT_ANALYZER ?? 3002);
  await app.listen(port, '0.0.0.0');
  logger.log(`event_analyzer listening on ${port}`);
}

bootstrap();