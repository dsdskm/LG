import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import type { QueryDeepPartialEntity } from 'typeorm/query-builder/QueryPartialEntity';
import type { SuggestedAction } from '@ai-log/shared-contracts';

import { AnalyzerEntity } from './analyzer.entity';

@Injectable()
export class DbService {
  private readonly logger = new Logger(DbService.name);

  constructor(
    @InjectRepository(AnalyzerEntity)
    private readonly repo: Repository<AnalyzerEntity>,
  ) {}

  async createAnalyzerRecord(eventId: number): Promise<number> {
    try {
      const entity = this.repo.create({ eventId });
      const saved = await this.repo.save(entity);
      this.logger.log(`[db] insert analysis OK id=${saved.id} eventId=${eventId}`);
      return saved.id;
    } catch (e: any) {
      this.logger.error(
        `[db] insert analysis FAILED eventId=${eventId} err=${e?.message ?? String(e)}`,
      );
      throw e;
    }
  }

  async updateAnalyzerResult(
    id: number,
    summary?: string | null,
    reason?: string | null,
  ): Promise<void> {
    if (id === undefined || id === null) {
      throw new Error('Analyzer ID is empty');
    }

    const patch = {} as QueryDeepPartialEntity<AnalyzerEntity>;
    if (summary !== undefined) patch.summary = summary as any;
    if (reason !== undefined) patch.reason = reason as any;

    if (Object.keys(patch).length === 0) return;

    try {
      const res = await this.repo.update({ id }, patch);
      const affected = res.affected ?? 0;
      const fields = Object.keys(patch).join(',');
      if (affected > 0) {
        this.logger.log(`[db] update analysis OK id=${id} affected=${affected} fields=${fields}`);
      } else {
        this.logger.warn(`[db] update analysis NO-MATCH id=${id} affected=0 fields=${fields}`);
      }
    } catch (e: any) {
      this.logger.error(`[db] update analysis FAILED id=${id} err=${e?.message ?? String(e)}`);
      throw e;
    }
  }

  async updateAnalyzerFullResult(
    id: number,
    fields: {
      summary?: string | null;
      reason?: string | null;
      solutions?: string | null;
      funcKey?: string | null;
      severity?: string | null;
      service?: string | null;
      confidence?: number | null;
      actions?: SuggestedAction[] | null;
    },
  ): Promise<void> {
    if (id === undefined || id === null) {
      throw new Error('Analyzer ID is empty');
    }

    const patch = {} as QueryDeepPartialEntity<AnalyzerEntity>;

    if (fields.summary !== undefined) patch.summary = fields.summary as any;
    if (fields.reason !== undefined) patch.reason = fields.reason as any;
    if (fields.solutions !== undefined) {
      patch.solutions = fields.solutions as any;
    }
    if (fields.funcKey !== undefined) patch.funcKey = fields.funcKey as any;
    if (fields.severity !== undefined) patch.severity = fields.severity as any;
    if (fields.service !== undefined) patch.service = fields.service as any;
    if (fields.confidence !== undefined) {
      patch.confidence = fields.confidence as any;
    }
    if (fields.actions !== undefined) {
      patch.actions = fields.actions as any;
    }

    if (Object.keys(patch).length === 0) return;

    try {
      const res = await this.repo.update({ id }, patch);
      const affected = res.affected ?? 0;
      const fields = Object.keys(patch).join(',');
      if (affected > 0) {
        this.logger.log(`[db] update analysis OK id=${id} affected=${affected} fields=${fields}`);
      } else {
        this.logger.warn(`[db] update analysis NO-MATCH id=${id} affected=0 fields=${fields}`);
      }
    } catch (e: any) {
      this.logger.error(`[db] update analysis FAILED id=${id} err=${e?.message ?? String(e)}`);
      throw e;
    }
  }

  /** 사용자 수동 편집: eventId 기준으로 분석 필드를 갱신한다. (제공된 필드만) */
  async updateByEventId(
    eventId: number,
    fields: {
      summary?: string;
      reason?: string;
      solutions?: string;
      funcKey?: string;
      severity?: string;
      confidence?: number;
    },
  ): Promise<boolean> {
    const patch = {} as QueryDeepPartialEntity<AnalyzerEntity>;
    if (fields.summary !== undefined) patch.summary = fields.summary as any;
    if (fields.reason !== undefined) patch.reason = fields.reason as any;
    if (fields.solutions !== undefined) patch.solutions = fields.solutions as any;
    if (fields.funcKey !== undefined) patch.funcKey = fields.funcKey as any;
    if (fields.severity !== undefined) patch.severity = fields.severity as any;
    if (fields.confidence !== undefined) patch.confidence = fields.confidence as any;

    if (Object.keys(patch).length === 0) return false;

    try {
      const res = await this.repo.update({ eventId }, patch);
      const affected = res.affected ?? 0;
      const keys = Object.keys(patch).join(',');
      if (affected > 0) {
        this.logger.log(`[db] manual update OK eventId=${eventId} affected=${affected} fields=${keys}`);
      } else {
        this.logger.warn(`[db] manual update NO-MATCH eventId=${eventId} affected=0 fields=${keys}`);
      }
      return affected > 0;
    } catch (e: any) {
      this.logger.error(`[db] manual update FAILED eventId=${eventId} err=${e?.message ?? String(e)}`);
      throw e;
    }
  }

  async findAllAnalysis(params: {
    start?: string;
    end?: string;
    startIndex: number;
    count: number;
    eventIds?: number[];
    func?: string;
    severity?: string;
    summary?: string;
  }): Promise<{
    items: AnalyzerEntity[];
    totalCount: number;
    hasNext: boolean;
  }> {
    const {
      start,
      end,
      startIndex,
      count,
      eventIds,
      func,
      severity,
      summary,
    } = params;

    let filteredQb = this.repo.createQueryBuilder('analysis');

    if (start) {
      filteredQb = filteredQb.andWhere('analysis.createdAt >= :start', {
        start: `${start} 00:00:00`,
      });
    }

    if (end) {
      filteredQb = filteredQb.andWhere('analysis.createdAt <= :end', {
        end: `${end} 23:59:59`,
      });
    }

    if (Array.isArray(eventIds) && eventIds.length > 0) {
      filteredQb = filteredQb.andWhere('analysis.eventId IN (:...eventIds)', {
        eventIds,
      });
    }

    const funcValue = typeof func === 'string' ? func.trim() : '';
    if (funcValue) {
      filteredQb = filteredQb.andWhere('analysis.funcKey = :funcKey', {
        funcKey: funcValue,
      });
    }

    const severityValue = typeof severity === 'string' ? severity.trim() : '';
    if (severityValue) {
      filteredQb = filteredQb.andWhere('analysis.severity = :severity', {
        severity: severityValue,
      });
    }

    const summaryValue = typeof summary === 'string' ? summary.trim() : '';
    if (summaryValue) {
      const escaped = summaryValue.replace(/[%_\\]/g, (m) => `\\${m}`);
      filteredQb = filteredQb.andWhere('analysis.summary ILIKE :summary', {
        summary: `%${escaped}%`,
      });
    }

    const totalCount = await filteredQb.clone().getCount();

    const entries = await filteredQb
      .clone()
      .orderBy('analysis.id', 'DESC')
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

  async findByEventId(eventId: number): Promise<AnalyzerEntity | null> {
    const entity = await this.repo.findOne({ where: { eventId } });
    return entity ?? null;
  }
}