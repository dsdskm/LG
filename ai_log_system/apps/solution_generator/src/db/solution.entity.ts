import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn, UpdateDateColumn, Index } from "typeorm";

@Entity({ name: "solutions" })
export class SolutionEntity {
    @PrimaryGeneratedColumn("increment")
    id!: number;

    @Column({ type: "int", name: "event_id", nullable: true })
    eventId?: number;

    @Column({ type: "jsonb", name: "solutions", default: () => "'[]'::jsonb" })
    solutions!: string[];

    @CreateDateColumn({ type: "timestamptz", name: "created_at" })
    createdAt!: Date;

    @UpdateDateColumn({ type: "timestamptz", name: "updated_at" })
    updatedAt!: Date;
}
