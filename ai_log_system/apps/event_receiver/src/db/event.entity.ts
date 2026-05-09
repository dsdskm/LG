// apps/event_receiver/src/db/event.entity.ts
import {
    Column,
    Entity,
    PrimaryGeneratedColumn,
    CreateDateColumn,
    UpdateDateColumn,
} from "typeorm";

@Entity({ name: "events" })
export class EventEntity {
    @PrimaryGeneratedColumn("increment")
    id!: number;

    @Column({ type: "text" })
    status!: string;

    // ✅ null 허용
    @Column({ type: "jsonb", name: "error_log_bundle", nullable: true })
    errorLogBundle!: unknown | any | null;

    // ✅ analysisIds / solutionIds 저장 (개발단계: JSONB 배열이 가장 간단)
    @Column({ type: "jsonb", name: "analysis_ids", default: () => "'[]'::jsonb" })
    analysisIds!: number[];

    @Column({ type: "jsonb", name: "solution_ids", default: () => "'[]'::jsonb" })
    solutionIds!: number[];

    // ✅ 자동 입력/업데이트
    @CreateDateColumn({ type: "timestamptz", name: "created_at" })
    createdAt!: Date;

    @UpdateDateColumn({ type: "timestamptz", name: "updated_at" })
    updatedAt!: Date;
}