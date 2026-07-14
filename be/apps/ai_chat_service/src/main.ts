import "dotenv/config";
import { NestFactory } from '@nestjs/core';
import { Logger } from "@nestjs/common";
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from "./app.module";

function buildAllowedOrigins(...ports: number[]) {
  const hosts = ['localhost', '127.0.0.1'];

  const localOrigins = hosts.flatMap((host) =>
    ports.map((port) => `http://${host}:${port}`),
  );

  const defaultOrigins = [
    'https://dev.hcrsp.com',
  ];

  const envOrigins = (process.env.CORS_ALLOWED_ORIGINS ?? '')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);

  return Array.from(
    new Set([
      ...localOrigins,
      ...defaultOrigins,
      ...envOrigins,
    ]),
  );
}

async function bootstrap() {
  const logger = new Logger('Main');
  const app = await NestFactory.create(AppModule);

  app.enableCors({
    origin: true, // 개발 환경: 모든 origin 허용
  });

  const swaggerConfig = new DocumentBuilder()
    .setTitle('ai_chat_service API')
    .setDescription('Auto-generated API docs for ai_chat_service')
    .setVersion('1.0.0')
    .build();

  const swaggerDocument = SwaggerModule.createDocument(
    app,
    swaggerConfig,
  );

  SwaggerModule.setup('docs', app, swaggerDocument, {
    jsonDocumentUrl: 'docs-json',
    yamlDocumentUrl: 'docs-yaml',
  });

  const port = Number(process.env.PORT_AI_CHAT_SERVICE ?? 3007);

  await app.listen(port, '0.0.0.0');

  logger.log(`ai_chat_service listening on ${port}`);
}

bootstrap();