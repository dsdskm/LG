import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SolutionEntity } from './db/solution.entity';
import { DbService } from './db/db.service';
import { SolutionService } from './solution/solution.service';
import { SolutionController } from './solution/solution.controller';
import { ReceiverApi } from './api/receiver.api';
import { ReportApi } from './api/report.api';
import { ApiClient } from '@ai-log/http-api';

@Module({
  imports: [
    TypeOrmModule.forRoot({
      type: 'postgres',
      url: process.env.DB_URL_SOLUTION_GENERATOR,
      entities: [SolutionEntity],
      synchronize: true,
      logging: false,
    }),
    TypeOrmModule.forFeature([SolutionEntity]),
  ],
  controllers: [SolutionController],
  providers: [SolutionService, DbService, ReceiverApi, ReportApi,ApiClient],
})
export class AppModule { }
