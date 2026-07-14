import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  Unique,
  UpdateDateColumn,
} from "typeorm";

@Entity("event")
@Unique(["key"])
export class EventConfigEntity {
  @PrimaryGeneratedColumn({ type: "integer" })
  id!: number;

  @Column({ type: "text", name: "key" })
  key!: string;

  @Column({ type: "text", name: "value" })
  value!: string;

  @Column({ type: "text", name: "updated_by", nullable: true })
  updatedBy?: string | null;

  @CreateDateColumn({ type: "timestamptz", name: "created_at" })
  createdAt!: Date;

  @UpdateDateColumn({ type: "timestamptz", name: "updated_at" })
  updatedAt!: Date;
}