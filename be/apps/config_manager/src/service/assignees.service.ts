import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import type {
  Assignee,
  AssigneeInput,
  AssigneesInput,
} from "@ai-log/shared-contracts";
import { Repository } from "typeorm";
import { AssigneeEntity } from "../db/assignee.entity";

function validateInput(body: Partial<AssigneesInput>): void {
  if (!Array.isArray(body.assignees)) {
    throw new BadRequestException("assignees는 객체 배열이어야 합니다.");
  }

  const hasInvalid = body.assignees.some(
    (r: any) =>
      !r ||
      typeof r !== "object" ||
      typeof r.email !== "string" ||
      typeof r.name !== "string" ||
      typeof r.team !== "string" ||
      typeof r.profile !== "string" ||
      !Array.isArray(r.tags) ||
      r.tags.some((tag: any) => typeof tag !== "string"),
  );

  if (hasInvalid) {
    throw new BadRequestException(
      "각 assignee는 email/name/team/profile/tags(string[]) 형식이어야 합니다.",
    );
  }
}

function normalizeTags(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  const set = new Set<string>();
  for (const item of value) {
    const tag = String(item ?? "").trim();
    if (tag) set.add(tag);
  }
  return Array.from(set);
}

function normalizeInputRow(row: AssigneeInput): AssigneeInput | null {
  const email = String(row.email ?? "").trim();
  const name = String(row.name ?? "").trim();
  const team = String(row.team ?? "").trim();
  const profile = String(row.profile ?? "").trim();
  const tags = normalizeTags(row.tags);

  if (!email || !name || !team) {
    return null;
  }

  return { email, name, team, profile, tags };
}

function toContract(row: AssigneeEntity): Assignee {
  return {
    id: row.id,
    email: String(row.email ?? "").trim(),
    name: String(row.name ?? "").trim(),
    team: String(row.team ?? "").trim(),
    profile: String(row.profile ?? "").trim(),
    func: String(row.func ?? "").trim(),
    tags: normalizeTags(row.tags),
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

function pickLatestUpdatedAt(rows: AssigneeEntity[]): Date | null {
  if (rows.length === 0) return null;
  const maxTs = Math.max(...rows.map((r) => new Date(r.updatedAt).getTime()));
  return Number.isFinite(maxTs) ? new Date(maxTs) : null;
}

@Injectable()
export class AssigneesService {
  private readonly logger = new Logger(AssigneesService.name);

  constructor(
    @InjectRepository(AssigneeEntity)
    private readonly assigneeRepo: Repository<AssigneeEntity>,
  ) {}

  async getAll(): Promise<Assignee[]> {
    try {
      const rows = await this.assigneeRepo.find({
        order: { team: "ASC", func: "ASC", email: "ASC" },
      });
      return rows.map(toContract);
    } catch (error: any) {
      this.logger.error(
        `[config_manager] assignees 전체 조회 오류: ${error?.message ?? String(error)}`,
      );
      throw new InternalServerErrorException(
        "담당자 전체 조회 중 오류가 발생했습니다.",
      );
    }
  }

  async getById(id: number): Promise<Assignee> {
    try {
      const row = await this.assigneeRepo.findOne({ where: { id } });
      if (!row) {
        throw new NotFoundException(`id=${id} 담당자를 찾을 수 없습니다.`);
      }
      return toContract(row);
    } catch (error: any) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.logger.error(
        `[config_manager] assignee 단건 조회 오류 id=${id}: ${error?.message ?? String(error)}`,
      );
      throw new InternalServerErrorException(
        "담당자 단건 조회 중 오류가 발생했습니다.",
      );
    }
  }

  async getByTeam(team: string): Promise<Assignee[]> {
    const normalizedTeam = String(team ?? "").trim();
    if (!normalizedTeam) {
      throw new BadRequestException("team이 필요합니다.");
    }

    try {
      const rows = await this.assigneeRepo.find({
        where: { team: normalizedTeam },
        order: { func: "ASC", email: "ASC" },
      });
      return rows.map(toContract);
    } catch (error: any) {
      this.logger.error(
        `[config_manager] assignees team 조회 오류 team=${normalizedTeam}: ${error?.message ?? String(error)}`,
      );
      throw new InternalServerErrorException(
        "team별 담당자 조회 중 오류가 발생했습니다.",
      );
    }
  }

  async getFunc(func: string): Promise<Assignee[]> {
    try {
      const normalizedFunc = String(func ?? "").trim();
      const rows = await this.assigneeRepo.find({
        where: { func: normalizedFunc },
        order: { email: "ASC" },
      });

      if (rows.length === 0) {
        throw new NotFoundException(`func=${normalizedFunc} 담당자를 찾을 수 없습니다.`);
      }

      return rows.map(toContract);
    } catch (error: any) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.logger.error(
        `[config_manager] func assignees 조회 오류: ${error?.message ?? String(error)}`,
      );
      throw new InternalServerErrorException(
        "FUNC별 담당자 조회 중 오류가 발생했습니다.",
      );
    }
  }

  async putFunc(
    func: string,
    body: AssigneesInput,
  ): Promise<Assignee> {
    if (!func?.trim()) {
      throw new BadRequestException("func가 필요합니다.");
    }

    validateInput(body);

    try {
      const normalizedFunc = func.trim();
      const normalizedRows = body.assignees
        .map((row) => normalizeInputRow(row))
        .filter((row): row is AssigneeInput => row !== null);

      await this.assigneeRepo.delete({ func: normalizedFunc });

      if (normalizedRows.length === 0) {
        throw new NotFoundException(`func=${normalizedFunc} 담당자를 찾을 수 없습니다.`);
      }

      const saved = await this.assigneeRepo.save(
        normalizedRows.map((row) =>
          this.assigneeRepo.create({
            ...row,
            func: normalizedFunc,
          }),
        ),
      );

      return toContract(saved[0]);
    } catch (error: any) {
      this.logger.error(
        `[config_manager] func assignees 저장 오류: ${error?.message ?? String(error)}`,
      );
      throw new InternalServerErrorException(
        "FUNC별 담당자 저장 중 오류가 발생했습니다.",
      );
    }
  }

  async deleteFunc(func: string): Promise<{ message: string }> {
    if (!func?.trim()) {
      throw new BadRequestException("func가 필요합니다.");
    }

    try {
      await this.assigneeRepo.delete({ func: func.trim() });
      return { message: "삭제되었습니다." };
    } catch (error: any) {
      this.logger.error(
        `[config_manager] func assignees 삭제 오류: ${error?.message ?? String(error)}`,
      );
      throw new InternalServerErrorException(
        "FUNC별 담당자 삭제 중 오류가 발생했습니다.",
      );
    }
  }
}