// apps/event_analyzer/src/db/db.service.ts
import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import type { QueryDeepPartialEntity } from "typeorm/query-builder/QueryPartialEntity";

import type { AnalyzerPayload } from "@ai-log/shared-contracts";
import { AnalyzerEntity } from "./analyzer.entity";

@Injectable()
export class DbService {
  constructor(
    @InjectRepository(AnalyzerEntity)
    private readonly repo: Repository<AnalyzerEntity>,
  ) { }

  /**
   * ✅ 수신 payload 저장
   * - AnalyzerEntity.id는 DB uuid 자동 생성
   * - createdAt/updatedAt은 @CreateDateColumn/@UpdateDateColumn이 자동 관리
   */
  async upsertAnalyzerPayload(body: AnalyzerPayload): Promise<number> {
    const entity = this.repo.create({ eventId: body.eventId });
    const saved = await this.repo.save(entity);
    return saved.id;
  }

  async updateAnalyzerResult(id: number, summary?: string | null, reason?: string | null): Promise<void> {
    if (id === undefined || id === null) throw new Error("Analyzer ID is empty");

    const patch = {} as QueryDeepPartialEntity<AnalyzerEntity>;
    if (summary !== undefined) patch.summary = summary as any;
    if (reason !== undefined) patch.reason = reason as any;
    if (Object.keys(patch).length === 0) return;

    await this.repo.update({ id }, patch);
  }

  async findByEventId(eventId: number): Promise<AnalyzerEntity | null> {
    const entity = await this.repo.findOne({ where: { eventId } });
    return entity ?? null;
  }
}