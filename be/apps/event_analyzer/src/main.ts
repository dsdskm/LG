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

function isLocalDevOrigin(origin: string) {
  return /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin);
}

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

  const allowedOrigins = buildAllowedOrigins(5173, 4173, 8080);
  app.enableCors({
    origin: (origin, callback) => {
      if (!origin) {
        callback(null, true);
        return;
      }

      if (allowedOrigins.includes(origin) || isLocalDevOrigin(origin)) {
        callback(null, true);
        return;
      }

      logger.warn(`Blocked CORS origin: ${origin}`);
      callback(null, false);
    },
    credentials: true,
    methods: ["GET", "HEAD", "PUT", "PATCH", "POST", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"],
    optionsSuccessStatus: 204,
  });

  const port = Number(process.env.PORT_EVENT_ANALYZER ?? 3002);
  await app.listen(port, '0.0.0.0');
  logger.log(`event_analyzer listening on ${port}`);
}

bootstrap();