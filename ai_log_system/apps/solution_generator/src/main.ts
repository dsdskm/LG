import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { Logger } from '@nestjs/common';

async function bootstrap() {
  const logger = new Logger("Main");
  const app = await NestFactory.create(AppModule);
  const port = Number(process.env.PORT_SOLUTION_GENERATOR ?? 3004);
  await app.listen(port,"0.0.0.0");
  logger.log(`listening on ${port}`);
}
bootstrap();
