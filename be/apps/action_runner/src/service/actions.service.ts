import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EventStatus, toKoreanTimeString, type ActionInput, type ActionItem } from '@ai-log/shared-contracts';
import { Repository } from 'typeorm';
import { ActionEntity } from '../db/action.entity';
import { ReportManagerApi } from '../api/report-manager.api';
import { ReceiverApi } from '../api/receiver.api';

@Injectable()
export class ActionsService {
  private readonly logger = new Logger(ActionsService.name);

  constructor(
    @InjectRepository(ActionEntity)
    private readonly actionRepo: Repository<ActionEntity>,
    private readonly reportManagerApi: ReportManagerApi,
    private readonly receiverApi: ReceiverApi,
  ) {}

  /**
   * 추천 액션을 실행한다(현재는 더미: 실제 수행 로직 없이 로그만 남긴다).
   * 실행이 끝나면 해당 이슈(eventId)를 "조치 완료(COMPLETED)" 상태로 전이한다.
   */
  async runAction(
    eventId: number,
    key?: string,
  ): Promise<{ ok: boolean; eventId: number; key?: string; status: string }> {
    const resolvedKey = key?.trim() || undefined;

    if (resolvedKey) {
      const action = await this.actionRepo.findOne({
        where: { key: resolvedKey },
      });
      if (!action) {
        this.logger.warn(
          `[action_runner] runAction 알 수 없는 key=${resolvedKey} eventId=${eventId}`,
        );
      }
    }

    // TODO: 실제 액션 수행 로직 연결 지점 (현재 더미)
    this.logger.log(
      `[action_runner] (dummy) runAction eventId=${eventId} key=${resolvedKey ?? '-'}`,
    );

    await this.receiverApi.patchEventStatus(eventId, EventStatus.COMPLETED);

    return {
      ok: true,
      eventId,
      key: resolvedKey,
      status: EventStatus.COMPLETED.toUpperCase(),
    };
  }

  async listActions(): Promise<ActionItem[]> {
    const rows = await this.actionRepo.find({
      order: { id: 'ASC' },
    });
    return rows.map((row) => this.toActionItem(row));
  }

  /**
   * 특정 func에 사용 가능한 활성(enable) 액션 목록.
   * - funcs 가 비어 있는 액션은 "모든 기능 공통"으로 보고 항상 포함한다.
   * - event_analyzer 의 후속 액션 후보 조회에 사용.
   */
  async listActionsByFunc(func: string): Promise<ActionItem[]> {
    const target = String(func ?? '').trim();
    const rows = await this.actionRepo.find({ order: { id: 'ASC' } });

    return rows
      .filter((row) => row.enable)
      .filter((row) => {
        const funcs = Array.isArray(row.funcs) ? row.funcs : [];
        if (funcs.length === 0) return true; // 공통 액션
        if (!target) return false;
        return funcs.map((f) => String(f).trim()).includes(target);
      })
      .map((row) => this.toActionItem(row));
  }

  async getAction(id: number): Promise<ActionItem | null> {
    const row = await this.actionRepo.findOne({ where: { id } });
    return row ? this.toActionItem(row) : null;
  }

  async createAction(input: ActionInput): Promise<ActionItem> {
    this.validateActionInput(input);
    const action = this.normalizeActionInput(input);

    const created = this.actionRepo.create({
      key: action.key,
      name: action.name,
      description: action.description,
      enable: action.enable,
      funcs: action.funcs,
    });

    const saved = await this.actionRepo.save(created);
    return this.toActionItem(saved);
  }

  async updateAction(id: number, input: ActionInput): Promise<ActionItem | null> {
    const existing = await this.actionRepo.findOne({ where: { id } });
    if (!existing) return null;

    this.validateActionInput(input);
    const action = this.normalizeActionInput(input);

    const nextRow = this.actionRepo.create({
      ...existing,
      key: action.key,
      name: action.name,
      description: action.description,
      enable: action.enable,
      funcs: action.funcs,
    });

    const saved = await this.actionRepo.save(nextRow);
    return this.toActionItem(saved);
  }

  async removeAction(id: number): Promise<boolean> {
    const result = await this.actionRepo.delete({ id });
    return (result.affected ?? 0) > 0;
  }

  private normalizeActionInput(input: ActionInput): {
    key: string;
    name: string;
    description: string;
    enable: boolean;
    funcs: string[];
  } {
    const key = String(input.key ?? '').trim();
    const name = String(input.name ?? '').trim();
    const description = String(input.description ?? '').trim();
    const enable = input.enable ?? true;
    const funcs = this.normalizeFuncs(input.funcs);

    return {
      key,
      name,
      description,
      enable,
      funcs,
    };
  }

  /** funcs 입력 정규화: 문자열 배열 → trim + 빈값 제거 + 중복 제거 */
  private normalizeFuncs(value: unknown): string[] {
    const arr = Array.isArray(value) ? value : [];
    const cleaned = arr
      .map((v) => String(v ?? '').trim())
      .filter((v) => v.length > 0);
    return Array.from(new Set(cleaned));
  }

  private validateActionInput(input: ActionInput): void {
    const key = String(input?.key ?? '').trim();
    if (!key) {
      throw new BadRequestException('key는 필수입니다.');
    }

    const name = String(input?.name ?? '').trim();
    if (!name) {
      throw new BadRequestException('name은 필수입니다.');
    }

    if (input?.enable !== undefined && typeof input.enable !== 'boolean') {
      throw new BadRequestException('enable은 boolean이어야 합니다.');
    }

    if (input?.funcs !== undefined && !Array.isArray(input.funcs)) {
      throw new BadRequestException('funcs는 문자열 배열이어야 합니다.');
    }
  }

  async relayEventId(eventId: number): Promise<void> {
    this.logger.log(`relayEventId eventId=${eventId}`);
    await this.reportManagerApi.postEventId(eventId);
  }

  private toActionItem(row: ActionEntity): ActionItem {
    return {
      id: row.id,
      key: row.key,
      name: row.name,
      description: row.description,
      enable: row.enable,
      funcs: Array.isArray(row.funcs) ? row.funcs : [],
      createdAt: toKoreanTimeString(row.createdAt),
      updatedAt: toKoreanTimeString(row.updatedAt),
    };
  }
}
