import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { clearTaskflowRulesCache } from '../../../pipeline/taskflow-language-rules';
import { ChatRuleEntity } from './chat-rule.entity';

export type ChatRuleRow = ChatRuleEntity;

function routeMatchesTemplate(template: string, actual: string): boolean {
  const tpl =
    String(template ?? '')
      .trim()
      .split(/[?#]/, 1)[0]
      ?.replace(/^\/+/, '') ?? '';
  const act =
    String(actual ?? '')
      .trim()
      .split(/[?#]/, 1)[0]
      ?.replace(/^\/+/, '') ?? '';
  if (!tpl || !act) return false;

  const tplSeg = tpl.split('/').filter(Boolean);
  const actSeg = act.split('/').filter(Boolean);
  if (tplSeg.length !== actSeg.length) return false;

  for (let i = 0; i < tplSeg.length; i += 1) {
    const t = tplSeg[i];
    const a = actSeg[i];
    if (!t || !a) return false;
    if (t.startsWith(':')) continue;
    if (t !== a) return false;
  }

  return true;
}

function describeRuleNames(
  rows: Array<{ ruleKey?: string }> | undefined | null,
): string {
  if (!rows || rows.length === 0) return 'none';
  return rows.map((row) => `${row.ruleKey ?? 'unknown'}`).join(', ');
}

@Injectable()
export class ChatRuleService {
  private readonly logger = new Logger(ChatRuleService.name);

  constructor(
    @InjectRepository(ChatRuleEntity)
    private readonly repository: Repository<ChatRuleEntity>,
  ) {}

  async listByAppAndScreen(
    appKey?: string,
    screenKey?: string,
  ): Promise<ChatRuleEntity[]> {
    const normalizedAppKey = String(appKey ?? '').trim();
    const normalizedScreenKey = String(screenKey ?? '').trim();

    const baseWhere = {
      ...(normalizedAppKey ? { appKey: normalizedAppKey } : {}),
      enabled: true,
    };

    const exactRows = normalizedScreenKey
      ? await this.repository.find({
          where: {
            ...baseWhere,
            screenKey: normalizedScreenKey,
          },
          order: { priority: 'DESC', updatedAt: 'DESC', id: 'DESC' },
        })
      : [];

    const appRows = normalizedAppKey
      ? await this.repository.find({
          where: {
            ...baseWhere,
            screenKey: normalizedAppKey,
          },
          order: { priority: 'DESC', updatedAt: 'DESC', id: 'DESC' },
        })
      : [];

    if (!normalizedScreenKey) {
      const allRows = await this.repository.find({
        where: baseWhere,
        order: { priority: 'DESC', updatedAt: 'DESC', id: 'DESC' },
      });
      const finalRows = Array.from(
        new Map(
          allRows.map((row) => [
            `${row.appKey}:${row.screenKey}:${row.ruleKey}`,
            row,
          ]),
        ).values(),
      );
      this.logger.warn(
        `[chat-rule] list appKey=${normalizedAppKey || '-'} screenKey=${normalizedScreenKey || '-'} count=${finalRows.length} keys=[${describeRuleNames(finalRows)}]`,
      );
      return finalRows;
    }

    const allRows = await this.repository.find({
      where: baseWhere,
      order: { priority: 'DESC', updatedAt: 'DESC', id: 'DESC' },
    });
    const templateRows = allRows.filter((row) =>
      routeMatchesTemplate(String(row.screenKey ?? ''), normalizedScreenKey),
    );

    const combined = [...exactRows, ...templateRows, ...appRows];
    const finalRows = Array.from(
      new Map(
        combined.map((row) => [
          `${row.appKey}:${row.screenKey}:${row.ruleKey}`,
          row,
        ]),
      ).values(),
    );

    this.logger.warn(
      `[chat-rule] list appKey=${normalizedAppKey || '-'} screenKey=${normalizedScreenKey || '-'} count=${finalRows.length} keys=[${describeRuleNames(finalRows)}]`,
    );
    return finalRows;
  }

  async listAll(): Promise<ChatRuleEntity[]> {
    return this.repository.find({
      where: { enabled: true },
      order: {
        appKey: 'ASC',
        screenKey: 'ASC',
        ruleKey: 'ASC',
        priority: 'DESC',
        updatedAt: 'DESC',
        id: 'DESC',
      },
    });
  }

  async upsert(input: Partial<ChatRuleEntity>): Promise<ChatRuleEntity> {
    const existing = await this.repository.findOne({
      where: {
        appKey: String(input.appKey ?? 'common').trim() || 'common',
        screenKey: String(input.screenKey ?? 'common').trim() || 'common',
        ruleKey: String(input.ruleKey ?? '').trim(),
      },
    });
    const row = this.repository.create({ ...existing, ...input });
    const saved = await this.repository.save(row);
    clearTaskflowRulesCache(saved.screenKey);
    return saved;
  }

  async deleteById(id: number): Promise<ChatRuleEntity | null> {
    const row = await this.repository.findOne({ where: { id } });
    if (!row) return null;
    const deleted = await this.repository.remove(row);
    clearTaskflowRulesCache(row.screenKey);
    return deleted;
  }
}
