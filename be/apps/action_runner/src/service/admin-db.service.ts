import { BadRequestException, Injectable, Logger } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { ActionEntity } from "../db/action.entity";

/**
 * 관리용 액션 import. DB 접근은 ActionEntity Repository를 통해서만 수행한다.
 */
@Injectable()
export class AdminDbService {
  private readonly logger = new Logger(AdminDbService.name);

  constructor(
    @InjectRepository(ActionEntity)
    private readonly actionRepository: Repository<ActionEntity>,
  ) {}

  async importActions(actions: unknown): Promise<{ ok: true; imported: number }> {
    if (!Array.isArray(actions)) {
      throw new BadRequestException("actions 배열이 필요합니다.");
    }

    try {
      await this.actionRepository.clear();
      const rows = actions.map((item) => this.actionRepository.create(item as Partial<ActionEntity>));
      await this.actionRepository.save(rows);
      this.logger.log(`[admin] action import 완료: imported=${rows.length}`);
      return { ok: true, imported: rows.length };
    } catch (e: any) {
      this.logger.error(`[admin] DB import 실패: ${e?.message ?? String(e)}`);
      throw new BadRequestException(
        `DB import 실패: ${e?.message ?? String(e)}`,
      );
    }
  }
}
