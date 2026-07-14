import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from "typeorm";

@Entity({ name: "assignees" })
@Index("IDX_assignees_func", ["func"])
@Index("UQ_assignees_func_email", ["func", "email"], { unique: true })
export class AssigneeEntity {
  @PrimaryGeneratedColumn("increment")
  id!: number;

  @Column({ type: "text", name: "email", nullable: false })
  email!: string;

  @Column({ type: "text", name: "name", nullable: false })
  name!: string;

  @Column({ type: "text", name: "team", nullable: false })
  team!: string;

  @Column({ type: "text", name: "profile", nullable: false, default: "" })
  profile!: string;

  @Column({ type: "text", name: "func", nullable: false })
  func!: string;

  @Column({ type: "json", name: "tags", nullable: false, default: () => "'[]'" })
  tags!: string[];

  @CreateDateColumn({ type: "timestamptz", name: "created_at" })
  createdAt!: Date;

  @UpdateDateColumn({ type: "timestamptz", name: "updated_at" })
  updatedAt!: Date;
}
