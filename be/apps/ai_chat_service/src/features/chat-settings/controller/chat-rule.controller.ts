import {
  Body,
  Controller,
  Delete,
  Get,
  Logger,
  Param,
  Post,
  Put,
  Query,
} from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ok } from '@ai-log/shared-contracts';
import { matchFrontRuleRows } from '../../../domains/front-rule/front-rule-engine';
import { ChatRuleService } from '../db/chat-rule.service';

@ApiTags('chat-settings')
@Controller('chat/settings/rules')
export class ChatRuleController {
  private readonly logger = new Logger(ChatRuleController.name);

  constructor(private readonly chatRules: ChatRuleService) {}

  @Get()
  @ApiOperation({ summary: 'generic rules 목록 조회' })
  @ApiOkResponse({ description: '앱/화면 범위 기준 rules 조회' })
  async list(
    @Query('app_key') appKeyQuery?: string,
    @Query('screen_key') screenKeyQuery?: string,
  ) {
    const appKey = String(appKeyQuery ?? '').trim() || undefined;
    const screenKey = String(screenKeyQuery ?? '').trim() || undefined;

    const requestLog = {
      appKey,
      screenKey,
      raw: {
        app_key: appKeyQuery,
        screen_key: screenKeyQuery,
      },
    };
    this.logger.log(
      `[chat_settings/rules] list request received ${JSON.stringify(requestLog)}`,
    );

    const items = await this.chatRules.listByAppAndScreen(appKey, screenKey);

    const resultLog = {
      appKey,
      screenKey,
      total: items.length,
      rawItems: items,
      fullResponse: { items },
    };

    return ok({ items });
  }

  @Get('all')
  async listAll() {
    const items = await this.chatRules.listAll();
    return ok({ items });
  }

  @Post('match')
  @ApiOperation({ summary: '화면별 taskflow command rule 매칭' })
  async matchCommand(@Body() body: Record<string, unknown>) {
    const appKey = String(body?.appKey ?? body?.app_key ?? '').trim();
    const screenKey = String(body?.screenKey ?? body?.screen_key ?? '').trim();
    const message = String(body?.message ?? '').trim();

    if (!appKey || !screenKey || !message) {
      return ok({ match: null });
    }

    const rows = await this.chatRules.listByAppAndScreen(appKey, screenKey);
    const matched = matchFrontRuleRows({ screenKey, message }, rows);

    if (!matched) {
      const appRows = await this.chatRules.listByAppAndScreen(appKey);
      const availableScreenKeys = Array.from(
        new Set(
          appRows
            .filter((row) => String(row.screenKey ?? '').trim() !== appKey)
            .filter((row) =>
              Boolean(
                matchFrontRuleRows({ screenKey: row.screenKey, message }, [
                  row,
                ]),
              ),
            )
            .map((row) => String(row.screenKey ?? '').trim())
            .filter(Boolean),
        ),
      );

      if (availableScreenKeys.length > 0) {
        return ok({ availableScreenKeys });
      }

      return ok(null);
    }

    return ok(matched);
  }

  @Post()
  @ApiOperation({ summary: 'generic rule 생성/업서트' })
  @ApiOkResponse({ description: 'rule 저장 결과' })
  async upsert(@Body() body: Record<string, unknown>) {
    const appKey =
      String(body?.appKey ?? body?.app_key ?? 'common').trim() || 'common';
    const screenKey =
      String(body?.screenKey ?? body?.screen_key ?? 'common').trim() ||
      'common';
    const ruleKey = String(body?.ruleKey ?? body?.rule_key ?? '').trim();

    const command = String(body?.command ?? '').trim() || undefined;
    const patternRegex =
      String(body?.patternRegex ?? body?.regex ?? '').trim() || undefined;
    const description =
      String(
        body?.description ?? body?.display ?? body?.help ?? body?.label ?? '',
      ).trim() || undefined;
    const replyText =
      String(body?.replyText ?? body?.reply_text ?? '').trim() || undefined;
    const fallbackText =
      String(body?.fallbackText ?? body?.fallback_text ?? '').trim() ||
      undefined;
    const exampleRaw = body?.example ?? body?.examples ?? [];
    const example = Array.isArray(exampleRaw)
      ? exampleRaw.map((item) => String(item ?? '').trim()).filter(Boolean)
      : typeof exampleRaw === 'string'
        ? exampleRaw
            .split(/[\n,]/)
            .map((item) => item.trim())
            .filter(Boolean)
        : undefined;
    const enabledValue = body?.enabled;
    const enabled = enabledValue === undefined ? true : Boolean(enabledValue);

    if (!ruleKey) {
      throw new Error('ruleKey is required');
    }

    const sharedRuleKeys = new Set([
      'type',
      'command',
      'pattern_regex',
      'patternRegex',
      'description',
      'reply_text',
      'replyText',
      'fallback_text',
      'fallbackText',
      'example',
      'rule_key',
      'ruleKey',
      'app_key',
      'appKey',
      'screen_key',
      'screenKey',
      'enabled',
      'created_at',
      'createdAt',
      'updated_at',
      'updatedAt',
      'id',
    ]);

    const sanitizeExtraJson = (value: unknown): Record<string, unknown> => {
      if (!value || typeof value !== 'object' || Array.isArray(value)) {
        return {};
      }

      return Object.fromEntries(
        Object.entries(value as Record<string, unknown>).filter(
          ([key]) =>
            !sharedRuleKeys.has(key) &&
            !sharedRuleKeys.has(key.replace(/_/g, '')),
        ),
      );
    };

    const extraJsonValue =
      body?.extraJson ?? body?.extra_json ?? body?.extra ?? {};
    const extraJson = sanitizeExtraJson(extraJsonValue);

    const row = await this.chatRules.upsert({
      appKey,
      screenKey,
      ruleKey,
      command,
      patternRegex,
      description,
      replyText,
      fallbackText,
      example,
      extraJson,
      enabled,
    });

    this.logger.log(
      `[chat_settings/rules] upsert appKey=${appKey} screenKey=${screenKey} ruleKey=${ruleKey}`,
    );
    return ok(row);
  }

  @Put()
  async replace(@Body() body: Record<string, unknown>) {
    return this.upsert(body);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'generic rule 삭제' })
  @ApiOkResponse({ description: '삭제된 rule 반환' })
  async deleteRule(@Param('id') id: string) {
    const parsedId = Number(id);
    if (!Number.isFinite(parsedId) || parsedId <= 0) {
      throw new Error('invalid rule id');
    }

    const deleted = await this.chatRules.deleteById(parsedId);
    this.logger.log(
      `[chat_settings/rules] delete id=${parsedId} deleted=${Boolean(deleted)}`,
    );
    return ok({ deleted });
  }
}
