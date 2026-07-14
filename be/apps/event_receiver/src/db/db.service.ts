import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { EventEntity } from './event.entity';

@Injectable()
export class DbService {
  constructor(
    @InjectRepository(EventEntity)
    private readonly repo: Repository<EventEntity>,
  ) {}

  /**
   * handleMcapBuffer 시작하자마자 placeholder 생성
   * - id는 DB가 자동 생성
   * - createdAt/updatedAt도 자동
   */
  async createPlaceholder(
    status = 'RECEIVED',
    robotId = 'UNKNOWN',
  ): Promise<EventEntity> {
    const entity = this.repo.create({
      robotId,
      status,
      errorLogBundle: null,
    });

    return await this.repo.save(entity);
  }

  async updateErrorBundle(args: {
    id: number;
    robotId?: string;
    errorLogBundle?: unknown | null;
    fullLog?: unknown | null;
  }): Promise<void> {
    const patch: Partial<EventEntity> = {};

    if (args.robotId !== undefined) patch.robotId = args.robotId;
    if (args.errorLogBundle !== undefined) {
      patch.errorLogBundle = args.errorLogBundle;
    }
    if (args.fullLog !== undefined) {
      patch.fullLog = args.fullLog;
    }

    await this.repo.update({ id: args.id }, patch);
  }

  async updateStatus(args: { id: number; status: string }): Promise<void> {
    const patch: Partial<EventEntity> = {};

    if (args.status !== undefined) {
      patch.status = args.status;
    }

    await this.repo.update({ id: args.id }, patch);
  }

  async overrideEventTimestamps(id: number, at: Date): Promise<void> {
    await this.repo.query(
      `UPDATE events SET created_at = $1, updated_at = $2 WHERE id = $3`,
      [at, at, id],
    );
  }

  async findEventById(id: number): Promise<EventEntity | null> {
    const event = await this.repo.findOne({ where: { id } });
    return event ?? null;
  }

  async findAllEvents(params: {
    start?: string;
    end?: string;
    startIndex: number;
    count: number;
    status?: string;
    eventIds?: number[];
  }): Promise<{
    items: EventEntity[];
    totalCount: number;
    hasNext: boolean;
  }> {
    const { start, end, startIndex, count, status, eventIds } = params;

    let filteredQb = this.repo.createQueryBuilder('event');

    if (start) {
      filteredQb = filteredQb.andWhere('event.createdAt >= :start', {
        start: `${start} 00:00:00`,
      });
    }

    if (end) {
      filteredQb = filteredQb.andWhere('event.createdAt <= :end', {
        end: `${end} 23:59:59`,
      });
    }

    if (status) {
      filteredQb = filteredQb.andWhere('event.status = :status', { status });
    }

    if (Array.isArray(eventIds) && eventIds.length > 0) {
      filteredQb = filteredQb.andWhere('event.id IN (:...eventIds)', {
        eventIds,
      });
    }

    const totalCount = await filteredQb.clone().getCount();

    const entries = await filteredQb
      .clone()
      .orderBy('event.id', 'DESC')
      .skip(startIndex)
      .take(count)
      .getMany();

    const hasNext = startIndex + entries.length < totalCount;

    return {
      items: entries,
      totalCount,
      hasNext,
    };
  }
}