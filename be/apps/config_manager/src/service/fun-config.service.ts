import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { FuncEntity } from "../db/func.entity";

@Injectable()
export class FunConfigService {
  constructor(
    @InjectRepository(FuncEntity)
    private readonly funcRepo: Repository<FuncEntity>,
  ) {}

  async getFuncPayload(): Promise<FuncEntity[]> {
    return this.funcRepo.find();
  }

  async setFuncPayload(funcsInput: string[] | string): Promise<{
    funcs: string[];
    updatedAt: Date;
  }> {
    const row = await this.upsertFuncCatalog(funcsInput);
    return {
      funcs: row.tags,
      updatedAt: row.updatedAt,
    };
  }

  async getFuncCatalog(): Promise<FuncEntity> {
    const existing = await this.funcRepo.findOne({
      where: { func: "default" },
    });

    if (existing) {
      existing.tags = this.normalizeFuncList(existing.tags);
      return this.funcRepo.save(existing);
    }

    const created = this.funcRepo.create({
      func: "default",
      tags: [],
    });
    return this.funcRepo.save(created);
  }

  async upsertFuncCatalog(funcsInput: string[] | string): Promise<FuncEntity> {
    const funcs = this.normalizeFuncList(funcsInput);
    if (funcs.length === 0) {
      throw new Error("funcs must contain at least one item");
    }

    const row = await this.getFuncCatalog();
    row.tags = funcs;
    return this.funcRepo.save(row);
  }

  async createFuncPayload(
    funcInput: string,
    tagsInput?: string[] | string,
    descriptionInput?: string,
    promptInput?: string,
    assigneesInput?: string[] | string,
  ): Promise<FuncEntity> {
    const func = this.normalizeFuncName(funcInput);
    if (!func) {
      throw new Error("func is required");
    }

    const existing = await this.funcRepo.findOne({ where: { func } });
    if (existing) {
      throw new Error("func already exists");
    }

    const entity = this.funcRepo.create({
      func,
      tags: this.normalizeFuncList(tagsInput),
      description: this.normalizeOptionalText(descriptionInput),
      prompt: this.normalizeOptionalText(promptInput),
      assignees: this.normalizeFuncList(assigneesInput),
    });
    return this.funcRepo.save(entity);
  }

  async getFuncByIdPayload(idInput: string): Promise<FuncEntity> {
    const id = this.toPositiveInt(idInput, "id");
    const row = await this.funcRepo.findOne({ where: { id } });
    if (!row) {
      throw new Error("not found");
    }
    return row;
  }

  async updateFuncByIdPayload(
    idInput: string,
    update: {
      func?: string;
      tags?: string[] | string;
      description?: string;
      prompt?: string;
      assignees?: string[] | string;
    },
  ): Promise<FuncEntity> {
    const id = this.toPositiveInt(idInput, "id");
    const row = await this.funcRepo.findOne({ where: { id } });
    if (!row) {
      throw new Error("not found");
    }

    const hasFunc = typeof update?.func !== "undefined";
    const hasTags = typeof update?.tags !== "undefined";
    const hasDescription = typeof update?.description !== "undefined";
    const hasPrompt = typeof update?.prompt !== "undefined";
    const hasAssignees = typeof update?.assignees !== "undefined";
    if (!hasFunc && !hasTags && !hasDescription && !hasPrompt && !hasAssignees) {
      throw new Error(
        "at least one of func, tags, description, prompt or assignees is required",
      );
    }

    if (hasFunc) {
      const func = this.normalizeFuncName(update?.func);
      if (!func) {
        throw new Error("func is required");
      }

      const duplicate = await this.funcRepo.findOne({ where: { func } });
      if (duplicate && duplicate.id !== row.id) {
        throw new Error("func already exists");
      }

      row.func = func;
    }

    if (hasTags) {
      row.tags = this.normalizeFuncList(update?.tags);
    }

    if (hasDescription) {
      row.description = this.normalizeOptionalText(update?.description);
    }

    if (hasPrompt) {
      row.prompt = this.normalizeOptionalText(update?.prompt);
    }

    if (hasAssignees) {
      row.assignees = this.normalizeFuncList(update?.assignees);
    }

    return this.funcRepo.save(row);
  }

  async deleteFuncByIdPayload(idInput: string): Promise<{ id: number; deleted: true }> {
    const id = this.toPositiveInt(idInput, "id");
    const row = await this.funcRepo.findOne({ where: { id } });
    if (!row) {
      throw new Error("not found");
    }

    await this.funcRepo.delete({ id });
    return { id, deleted: true };
  }

  private normalizeFuncList(
    funcsInput: string[] | string | undefined | null,
  ): string[] {
    const source = Array.isArray(funcsInput)
      ? funcsInput
      : String(funcsInput ?? "")
          .split(/\r?\n|,/g)
          .map((v) => v.trim());

    return Array.from(
      new Set(
        source.map((v) => String(v ?? "").trim()).filter((v) => v.length > 0),
      ),
    );
  }

  private normalizeFuncName(funcInput: unknown): string {
    return String(funcInput ?? "").trim();
  }

  private normalizeOptionalText(value: unknown): string | null {
    const text = String(value ?? "").trim();
    return text.length > 0 ? text : null;
  }

  private toPositiveInt(value: string, fieldName: string): number {
    const parsed = Number.parseInt(String(value ?? ""), 10);
    if (!Number.isInteger(parsed) || parsed <= 0) {
      throw new Error(`${fieldName} must be a positive integer`);
    }
    return parsed;
  }
}
