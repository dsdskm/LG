import "dotenv/config";
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { Logger } from "@nestjs/common";
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { KstDateInterceptor } from './common/kst-date.interceptor';

async function bootstrap() {
  const logger = new Logger("Main");
  const app = await NestFactory.create(AppModule);
  app.useGlobalInterceptors(new KstDateInterceptor());

  const swaggerConfig = new DocumentBuilder()
    .setTitle('report_manager API')
    .setDescription('Auto-generated API docs for report_manager')
    .setVersion('1.0.0')
    .build();
  const swaggerDocument = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('docs', app, swaggerDocument, {
    jsonDocumentUrl: 'docs-json',
    yamlDocumentUrl: 'docs-yaml',
  });

  app.enableCors();

  const port = process.env.PORT_REPORT_MANAGER || 3005;
  await app.listen(port, '0.0.0.0');
  logger.log(`event_receiver listening on ${port}`);
}
bootstrap();
