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

    @Column({ type: "text", name: "robot_id", default: "UNKNOWN" })
    robotId!: string;

    @Column({ type: "text" })
    status!: string;

    // ✅ null 허용
    @Column({ type: "jsonb", name: "error_log_bundle", nullable: true })
    errorLogBundle!: unknown | any | null;

    // 넘어온 최초 원문 로그 전체 (ParsedLogLine[]). LLM 분석 범위는 errorLogBundle 인덱스로 표시
    @Column({ type: "jsonb", name: "full_log", nullable: true })
    fullLog!: unknown | any | null;

    // ✅ 자동 입력/업데이트
    @CreateDateColumn({ type: "timestamptz", name: "created_at" })
    createdAt!: Date;

    @UpdateDateColumn({ type: "timestamptz", name: "updated_at" })
    updatedAt!: Date;
}