// apps/event_receiver/src/db/db.service.ts
import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";

import type { EventPayload } from "@ai-log/shared-contracts";
import { EventEntity } from "./event.entity";

@Injectable()
export class DbService {
    constructor(
        @InjectRepository(EventEntity)
        private readonly repo: Repository<EventEntity>,
    ) { }

    /**
     * ✅ handleMcapBuffer 시작하자마자 placeholder 생성
     * - id는 DB가 자동 생성(uuid)
     * - createdAt/updatedAt도 자동
     */
    async createPlaceholder(status = "RECEIVED"): Promise<EventEntity> {
        const entity = this.repo.create({
            status,
            errorLogBundle: null,
            analysisIds: [],
            solutionIds: [],
        });

        return await this.repo.save(entity);
    }

    async updateErrorBundle(args: {
        id: number;
        errorLogBundle?: unknown | null;
    }): Promise<void> {
        const patch: Partial<EventEntity> = {};
        if (args.errorLogBundle !== undefined) patch.errorLogBundle = args.errorLogBundle;

        await this.repo.update({ id: args.id }, patch);
    }


    async updateStatus(args: { id: number; status: string }): Promise<void> {
        const patch: Partial<EventEntity> = {};
        if (args.status !== undefined) patch.status = args.status; // ✅ 여기

        await this.repo.update({ id: args.id }, patch);
    }


    /**
     * ✅ (선택) 분석/솔루션 id 갱신
     */
    async updateIds(args: { id: number; analysisIds?: number[]; solutionIds?: number[]; status?: string }): Promise<void> {
        const patch: Partial<EventEntity> = {};
        if (args.analysisIds) patch.analysisIds = args.analysisIds;
        if (args.solutionIds) patch.solutionIds = args.solutionIds;
        if (args.status) patch.status = args.status;

        await this.repo.update({ id: args.id }, patch);
    }

    async findEventById(id: number): Promise<EventEntity | null> {
        const event = await this.repo.findOne({ where: { id } });
        return event ?? null;
    }

    async findAllEvents(): Promise<EventPayload[]> {
        const entries = await this.repo.find();
        return entries.map((entry) => this.toPayload(entry));
    }

    /**
     * ✅ (선택) entity -> EventPayload로 꺼내기
     */
    toPayload(e: EventEntity): EventPayload {
        return {
            id: e.id,
            status: e.status,
            errorLogBundle: (e.errorLogBundle ?? []) as any,
            analysisIds: Array.isArray(e.analysisIds) ? e.analysisIds : [],
            solutionIds: Array.isArray(e.solutionIds) ? e.solutionIds : [],
            createdAt: e.createdAt,
            updatedAt: e.updatedAt,
        };
    }
}