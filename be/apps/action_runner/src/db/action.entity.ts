import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  Unique,
  UpdateDateColumn,
} from "typeorm";

@Entity({ name: "actions" })
@Unique(["key"])
export class ActionEntity {
  @PrimaryGeneratedColumn({ type: "integer" })
  id!: number;

  @Column({ type: "text", name: "key" })
  key!: string;

  @Column({ type: "text", name: "name" })
  name!: string;

  @Column({ type: "text", name: "description", default: "" })
  description!: string;

  @Column({ type: "boolean", name: "enable", default: true })
  enable!: boolean;

  // 이 액션을 사용할 수 있는 기능(func) 키 목록. 비어 있으면 모든 기능에 적용.
  @Column({ type: "jsonb", name: "funcs", default: () => "'[]'" })
  funcs!: string[];

  @CreateDateColumn({ type: "timestamptz", name: "created_at" })
  createdAt!: Date;

  @UpdateDateColumn({ type: "timestamptz", name: "updated_at" })
  updatedAt!: Date;
}