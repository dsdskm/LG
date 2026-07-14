import { BadRequestException, Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { EventConfigEntity } from "../db/event-config.entity";

const KEY_ERROR_CONTEXT_LINES = "error_context_lines";

function clampErrorContextLines(value: number): number {
  return Math.max(0, Math.min(200, Math.trunc(value)));
}

@Injectable()
export class EventConfigService {
  constructor(
    @InjectRepository(EventConfigEntity)
    private readonly repo: Repository<EventConfigEntity>,
  ) {}

  async getErrorContextLines(): Promise<number> {
    const existing = await this.repo.findOne({ where: { key: KEY_ERROR_CONTEXT_LINES } });
    if (existing?.value) {
      const n = Number(existing.value);
      if (Number.isFinite(n)) {
        return clampErrorContextLines(n);
      }
    }

    const envFallback = Number(5);
    const fallback = Number.isFinite(envFallback)
      ? clampErrorContextLines(envFallback)
      : 5;
    await this.setErrorContextLines(fallback, "system-seed");
    return fallback;
  }

  async setErrorContextLines(
    errorContextLinesInput: number,
    updatedBy?: string,
  ): Promise<EventConfigEntity> {
    const errorContextLines = clampErrorContextLines(errorContextLinesInput);

    const existing = await this.repo.findOne({ where: { key: KEY_ERROR_CONTEXT_LINES } });
    if (existing) {
      existing.value = String(errorContextLines);
      existing.updatedBy = updatedBy?.trim() || existing.updatedBy || null;
      return this.repo.save(existing);
    }

    const row = this.repo.create({
      key: KEY_ERROR_CONTEXT_LINES,
      value: String(errorContextLines),
      updatedBy: updatedBy?.trim() || null,
    });
    return this.repo.save(row);
  }

  async getErrorContextLinesMeta(): Promise<{
    errorContextLines: number;
    updatedBy: string | null;
    updatedAt: Date | null;
  }> {
    await this.getErrorContextLines();
    const row = await this.repo.findOne({ where: { key: KEY_ERROR_CONTEXT_LINES } });

    return {
      errorContextLines: row?.value
        ? clampErrorContextLines(Number(row.value))
        : 5,
      updatedBy: row?.updatedBy ?? null,
      updatedAt: row?.updatedAt ?? null,
    };
  }

  async setErrorContextLinesFromInput(
    input: unknown,
    updatedBy?: string,
  ): Promise<EventConfigEntity> {
    const n = Number(input);
    if (!Number.isFinite(n)) {
      throw new BadRequestException("errorContextLines must be a number");
    }

    return this.setErrorContextLines(n, updatedBy);
  }
}
