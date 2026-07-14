import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  Unique,
  UpdateDateColumn,
} from "typeorm";

@Entity("funcs")
@Unique(["func"])
export class FuncEntity {
  @PrimaryGeneratedColumn({ type: "integer" })
  id!: number;

  @Column({ type: "text", name: "func", default: "default" })
  func!: string;

  @Column({ type: "jsonb", name: "tags", default: () => "'[]'::jsonb" })
  tags!: string[];

  @Column({ type: "text", name: "description", nullable: true })
  description?: string | null;

  @Column({ type: "text", name: "prompt", nullable: true })
  prompt?: string | null;

  @Column({ type: "jsonb", name: "assignees", default: () => "'[]'::jsonb" })
  assignees!: string[];

  @CreateDateColumn({ type: "timestamptz", name: "created_at" })
  createdAt!: Date;

  @UpdateDateColumn({ type: "timestamptz", name: "updated_at" })
  updatedAt!: Date;
}