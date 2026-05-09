import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module";
import { Logger } from "@nestjs/common";

async function bootstrap() {
  const logger = new Logger("Main");
  const app = await NestFactory.create(AppModule);

  app.enableCors({
    origin: ["http://localhost:9000", "http://localhost:3000", "http://localhost:3006"],
  });

  const port = Number(process.env.PORT_EVENT_ANALYZER ?? 3002);
  await app.listen(port,"0.0.0.0");
  logger.log(`listening on ${port}`);
}

bootstrap();