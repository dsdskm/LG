import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ReportEntity } from './report.entity';

@Injectable()
export class DbService {
  constructor(
    @InjectRepository(ReportEntity)
    private readonly repo: Repository<ReportEntity>,
  ) {}

  async saveReport(eventId: number, report: string): Promise<ReportEntity> {
    const entity = this.repo.create({ eventId, report });
    return this.repo.save(entity);
  }

  async findById(id: number): Promise<ReportEntity | null> {
    const report = await this.repo.findOne({ where: { id } });
    return report ?? null;
  }

  async findByEventId(eventId: number): Promise<ReportEntity | null> {
    const report = await this.repo.findOne({ where: { eventId } });
    return report ?? null;
  }

  async findAll(): Promise<ReportEntity[]> {
    return this.repo.find({ order: { createdAt: 'DESC' } });
  }
}
