// apps/event_analyzer/src/db/analyzer.entity.ts
import type { SuggestedAction } from "@ai-log/shared-contracts";
import {
    Column,
    CreateDateColumn,
    Entity,
    PrimaryGeneratedColumn,
    UpdateDateColumn,
} from "typeorm";

@Entity({ name: "analysis" })
export class AnalyzerEntity {
    @PrimaryGeneratedColumn("increment")
    id!: number;

    @Column({ type: "int", name: "event_id", nullable: true })
    eventId?: number;

    @Column({ type: "text", name: "summary", nullable: true })
    summary?: string;

    @Column({ type: "text", name: "reason", nullable: true })
    reason?: string;

    @Column({ type: "text", name: "solutions", nullable: true })
    solutions?: string;

    @Column({ type: "text", name: "func", nullable: true })
    funcKey?: string;

    @Column({ type: "text", name: "severity", nullable: true })
    severity?: string;

    @Column({ type: "text", name: "service", nullable: true })
    service?: string;

    // Stage1 분류 정확도 (0.00 ~ 1.00)
    @Column({ type: "real", name: "confidence", nullable: true })
    confidence?: number;

    // 후속 액션 제안 (분류된 func 후보 중 LLM이 선택). [{ key, name, reason }]
    @Column({ type: "jsonb", name: "actions", nullable: true })
    actions?: SuggestedAction[];

    // ✅ 자동 입력/업데이트
    @CreateDateColumn({ type: "timestamptz", name: "created_at" })
    createdAt!: Date;

    @UpdateDateColumn({ type: "timestamptz", name: "updated_at" })
    updatedAt!: Date;
}