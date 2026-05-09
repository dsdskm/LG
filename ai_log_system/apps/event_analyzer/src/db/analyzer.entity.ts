// apps/event_analyzer/src/db/analyzer.entity.ts
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

    @Column({ type: "jsonb", name: "solutions", nullable: true, default: () => "'[]'::jsonb" })
    solutions?: string[];

    @Column({ type: "text", name: "func", nullable: true })
    func?: string;

    @Column({ type: "text", name: "severity", nullable: true })
    severity?: string;

    // ✅ 자동 입력/업데이트
    @CreateDateColumn({ type: "timestamptz", name: "created_at" })
    createdAt!: Date;

    @UpdateDateColumn({ type: "timestamptz", name: "updated_at" })
    updatedAt!: Date;
}