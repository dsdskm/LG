import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  Unique,
  UpdateDateColumn,
} from "typeorm";

@Entity("llm")
@Unique(["provider"])
export class LlmConfigEntity {
  @PrimaryGeneratedColumn({ type: "integer" })
  id!: number;

  @Column({ type: "text", name: "provider" })
  provider!: string;

  @Column({ type: "text", name: "instruction" })
  instruction!: string;

  @Column({ type: "boolean", name: "is_active", default: false })
  isActive!: boolean;

  @CreateDateColumn({ type: "timestamptz", name: "created_at" })
  createdAt!: Date;

  @UpdateDateColumn({ type: "timestamptz", name: "updated_at" })
  updatedAt!: Date;
}