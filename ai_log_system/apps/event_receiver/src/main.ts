// apps/event_receiver/src/main.ts
import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module";
import * as express from "express";
import { Logger } from "@nestjs/common";

async function bootstrap() {
  const logger = new Logger("Main");
  const app = await NestFactory.create(AppModule);

  app.enableCors({ origin: ["http://localhost:9000", "http://localhost:3000", "http://localhost:3006",  "http://127.0.0.1:3006"] });

  // ✅ MCAP (application/octet-stream)을 Buffer로 받기
  app.use(
    express.raw({
      type: "application/octet-stream",
      limit: "100mb",
    })
  );

  const port = Number(process.env.PORT_EVENT_RECEIVER ?? 3001);
  await app.listen(port,"0.0.0.0");
  logger.log(`listening on ${port}`);
}

bootstrap();