import "dotenv/config";
import { NestFactory } from '@nestjs/core';
import { Logger } from "@nestjs/common";
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { join } from 'path';
import { AppModule } from "./app.module";

async function bootstrap() {
  const logger = new Logger('Main');
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    logger: (process.env.LOG_LEVELS?.split(',').map((s) => s.trim()) as any) ?? [
      'log',
      'error',
      'warn',
      'debug',
      'verbose',
    ],
  });

  app.useStaticAssets(join(process.cwd(), 'apps/ai_chat_service/assets'), {
    prefix: '/assets/',
  });

  app.enableCors({ origin: true, credentials: true });

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