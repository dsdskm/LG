import "dotenv/config";
import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module";
import * as express from "express";
import { Logger } from "@nestjs/common";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";
import { KstDateInterceptor } from "./common/kst-date.interceptor";

function buildAllowedOrigins(...ports: number[]) {
  const hosts = [
    "localhost",
    "127.0.0.1",
  ].filter((value): value is string => Boolean(value?.trim()));

  const localOrigins = hosts.flatMap((host) =>
    ports.map((port) => `http://${host.trim()}:${port}`)
  );
  const envOrigins = (process.env.CORS_ALLOWED_ORIGINS ?? "")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);

  return Array.from(new Set([...localOrigins, ...envOrigins]));
}

async function bootstrap() {
  const logger = new Logger("Main");
  const app = await NestFactory.create(AppModule);
  app.useGlobalInterceptors(new KstDateInterceptor());
  const swaggerConfig = new DocumentBuilder()
    .setTitle("event_receiver API")
    .setDescription("Auto-generated API docs for event_receiver")
    .setVersion("1.0.0")
    .build();
  const swaggerDocument = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup("docs", app, swaggerDocument, {
    jsonDocumentUrl: "docs-json",
    yamlDocumentUrl: "docs-yaml",
  });

  logger.log(`db url ${process.env.DB_URL_EVENT_RECEIVER}`)
  app.enableCors({ origin: true }); // 개발 환경: 모든 origin 허용

  // ✅ MCAP (application/octet-stream)을 Buffer로 받기
  app.use(
    express.raw({
      type: "application/octet-stream",
      limit: "100mb",
    })
  );

  const port = Number(process.env.PORT_EVENT_RECEIVER ?? 3001);
  await app.listen(port, '0.0.0.0');
  logger.log(`event_receiver listening on ${port}`);
}

bootstrap();