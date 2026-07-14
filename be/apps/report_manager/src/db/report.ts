import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from "typeorm";

@Entity({ name: "report" })
export class ReportSendHistoryEntity {
  @PrimaryGeneratedColumn("increment")
  id!: number;

  @Column({ type: "integer", name: "event_id", nullable: false })
  eventId!: number;

  @Column({ type: "text", name: "func_key", nullable: false, default: "" })
  funcKey!: string;

  @Column({ type: "json", name: "to_emails", nullable: false, default: () => "'[]'" })
  toEmails!: string[];

  @Column({ type: "text", name: "subject", nullable: false })
  subject!: string;

  @Column({ type: "text", name: "html", nullable: false })
  html!: string;

  @Column({ type: "text", name: "status", nullable: false })
  status!: "sent" | "failed";

  @Column({ type: "json", name: "accepted", nullable: false, default: () => "'[]'" })
  accepted!: string[];

  @Column({ type: "json", name: "rejected", nullable: false, default: () => "'[]'" })
  rejected!: string[];

  @Column({ type: "text", name: "error_message", nullable: false, default: "" })
  errorMessage!: string;

  @CreateDateColumn({ type: "timestamptz", name: "created_at" })
  createdAt!: Date;

  @UpdateDateColumn({ type: "timestamptz", name: "updated_at" })
  updatedAt!: Date;
}
