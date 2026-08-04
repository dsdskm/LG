import "dotenv/config";
import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module";
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
    .setTitle("config_manager API")
    .setDescription("Auto-generated API docs for config_manager")
    .setVersion("1.0.0")
    .build();
  const swaggerDocument = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup("docs", app, swaggerDocument, {
    jsonDocumentUrl: "docs-json",
    yamlDocumentUrl: "docs-yaml",
  });

  app.enableCors({ origin: true, credentials: true });

  const port = Number(process.env.PORT_CONFIG_MANAGER ?? 3008);
  await app.listen(port, "0.0.0.0");
  logger.log(`config_manager listening on ${port}`);
}

bootstrap();