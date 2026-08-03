import { Injectable, Logger } from '@nestjs/common';

import { writeFile, rm } from 'node:fs/promises';
import * as os from 'node:os';
import * as path from 'node:path';

import { McapParser } from 'src/utils/mcap.parser';

import {
  EventStatus,
  type AnalyzerPayload,
  type ErrorLogBundle,
  type EventPayload,
  type ParsedLogLine,
} from '@ai-log/shared-contracts';
import { ApiError } from '@ai-log/http-api';
import { AnalyzerApi } from 'src/api/analyzer.api';
import { ConfigManagerApi } from 'src/api/config-manager.api';
import { DbService } from 'src/db/db.service';
// Firestore 실시간 트리거 비활성화(주석 처리). 폴링으로 대체 중.
// import { updateFirestoreTriggerTime } from 'src/firebase/firestore';
import type { FetchEventsParams } from 'src/receiver.query';
import { toEventPayload } from 'src/event.mapper';

function normalizeParsedResult(input: any): {
  robotId: string;
  totalMessages: number;
  errorCount: number;
  errorLogBundle: ErrorLogBundle[];
  fullLog: ParsedLogLine[];
} {
  const robotId =
    typeof input?.robotId === 'string' && input.robotId.trim()
      ? input.robotId.trim()
      : 'UNKNOWN';
  const totalMessages = Number(input?.totalMessages ?? 0);
  const errorCount = Number(input?.errorCount ?? 0);
  const fullLog = Array.isArray(input?.fullLog)
    ? (input.fullLog as ParsedLogLine[])
    : [];

  if (Array.isArray(input?.errorLogBundle)) {
    return {
      robotId,
      totalMessages,
      errorCount,
      errorLogBundle: input.errorLogBundle as ErrorLogBundle[],
      fullLog,
    };
  }

  if (Array.isArray(input?.errorWindows)) {
    return {
      robotId,
      totalMessages,
      errorCount,
      errorLogBundle: input.errorWindows as ErrorLogBundle[],
      fullLog,
    };
  }

  return { robotId, totalMessages, errorCount, errorLogBundle: [], fullLog };
}

function isInvalidMcapError(error: unknown): boolean {
  const message = String((error as any)?.message ?? "");
  return /read only .* expected|invalid mcap|mcap/i.test(message);
}

@Injectable()
export class ReceiverService {
  private readonly logger = new Logger(ReceiverService.name);

  constructor(
    private readonly parser: McapParser,
    private readonly analyzerApi: AnalyzerApi,
    private readonly configManagerApi: ConfigManagerApi,
    private readonly receiverDb: DbService,
  ) {}

  async handleMcapBuffer(buffer: Buffer): Promise<number> {
    const startedAt = Date.now();
    const bytes = buffer?.length ?? 0;

    const requestKey = `req_${Date.now()}_${Math.random().toString(16).slice(2, 8)}`;
    let eventId: number | null = null;

    this.logger.log(`[${requestKey}] ingest/mcap received bytes=${bytes}`);

    const filePath = path.join(os.tmpdir(), `${requestKey}.mcap`);
    await writeFile(filePath, buffer);

    try {
      const ctxN = await this.configManagerApi.getErrorContextLines();
      const parsedRaw = await this.parser.parseMcapAndBuildErrorWindows(
        filePath,
        ctxN,
      );
      const parsed = normalizeParsedResult(parsedRaw);

      this.logger.log(
        `[${requestKey}] parsed totalMessages=${parsed.totalMessages} errorCount=${parsed.errorCount} bundles=${parsed.errorLogBundle.length}`,
      );

      if (parsed.errorLogBundle.length === 0) {
        const elapsedMs = Date.now() - startedAt;
        this.logger.log(`[${requestKey}] no ERROR -> 204 (skip DB insert) elapsedMs=${elapsedMs}`);
        return 204;
      }

      const row = await this.receiverDb.createPlaceholder(
        EventStatus.RECEIVED,
        parsed.robotId,
      );
      eventId = row.id;

      this.logger.log(
        `[${eventId}] created event row for error bundles=${parsed.errorLogBundle.length}`,
      );

      await this.receiverDb.updateErrorBundle({
        id: eventId,
        robotId: parsed.robotId,
        errorLogBundle: parsed.errorLogBundle,
        fullLog: parsed.fullLog,
      });
      await this.receiverDb.updateStatus({
        id: eventId,
        status: EventStatus.PREPARED,
      });

      const now = new Date();
      const payload: AnalyzerPayload = {
        id: eventId,
        eventId,
        errorLogBundle: parsed.errorLogBundle,
        createdAt: row.createdAt ?? now,
        updatedAt: now,
      };

      void this.analyzerApi
        .postEvent(payload)
        .then((status) => {
          this.logger.log(
            `[${eventId}] analyzer accepted status=${status} bundles=${parsed.errorLogBundle.length}`,
          );
        })
        .catch((e: any) => {
          if (e instanceof ApiError) {
            this.logger.error(
              `[${eventId}] analyzer call failed (async) status=${e.status} err=${e.message} bodyPreview=${e.bodyPreview ?? '-'}`,
            );
            return;
          }
          this.logger.error(
            `[${eventId}] analyzer call failed (async) err=${e?.message ?? String(e)}`,
          );
        });

      return 202;
    } catch (e: any) {
      const elapsedMs = Date.now() - startedAt;

      if (eventId) {
        await this.receiverDb.updateStatus({ id: eventId, status: 'FAILED' }).catch(
          () => {},
        );
      }

      if (isInvalidMcapError(e)) {
        this.logger.warn(
          `[${eventId ?? requestKey}] invalid mcap payload -> 400 elapsedMs=${elapsedMs} err=${e?.message ?? String(e)}`,
        );
        return 400;
      }

      this.logger.error(
        `[${eventId ?? requestKey}] ingest failed -> 500 elapsedMs=${elapsedMs} err=${e?.message ?? String(e)}`,
      );
      this.logger.debug(e?.stack ?? '');
      return 500;
    } finally {
      await rm(filePath, { force: true }).catch(() => {});
    }
  }

  async updateEventStatusAndTrigger(id: number, status: string): Promise<void> {
    this.logger.log(`updateEventStatus eventId=${id} status=${status}`);
    try {
      await this.receiverDb.updateStatus({ id, status });
      // Firestore 실시간 트리거: 일단 비활성화(주석 처리). 폴링으로 대체 중.
      // await updateFirestoreTriggerTime();
      // this.logger.log(`Firestore trigger updated for eventId=${id}`);
    } catch (error: any) {
      this.logger.error(
        `updateEventStatus failed for eventId=${id}: ${error?.message ?? error}`,
      );
    }
  }

  async fetchEvents(params: FetchEventsParams): Promise<{
    items: EventPayload[];
    pageInfo: {
      totalCount: number;
      count: number;
      index: number;
      hasNext: boolean;
    };
  }> {
    const { start, end, startIndex, count, status, eventIds } = params;

    const result = await this.receiverDb.findAllEvents({
      start,
      end,
      startIndex,
      count,
      status,
      eventIds,
    });

    // 목록에서도 전체 로그를 보여주고, errorLogBundle 인덱스로 분석 활용 구간을 표시한다.
    // (로그는 이벤트당 10~100줄이라 목록 비대화 부담이 작다.)
    const items = result.items.map((entry) =>
      toEventPayload(entry, { includeFullLog: true }),
    );

    this.logger.log(
      `fetchEvents start=${start ?? '-'} end=${end ?? '-'} status=${status ?? '-'} eventIds=${eventIds?.join(',') ?? '-'} startIndex=${startIndex} count=${count} items=${items.length} totalCount=${result.totalCount}`,
    );

    return {
      items,
      pageInfo: {
        totalCount: result.totalCount,
        count,
        index: startIndex,
        hasNext: result.hasNext,
      },
    };
  }

  async fetchEventById(id: number): Promise<EventPayload | null> {
    const event = await this.receiverDb.findEventById(id);
    if (!event) return null;
    return toEventPayload(event);
  }

  async fetchEventByIdFromParam(idParam: string): Promise<EventPayload | null> {
    const numericEventId = Number(idParam);
    this.logger.log(
      `getEventById received id=${idParam} parsedId=${numericEventId}`,
    );

    if (!Number.isInteger(numericEventId) || numericEventId <= 0) {
      return null;
    }

    const ret = await this.fetchEventById(numericEventId);
    this.logger.log(`getEventById id=${idParam}`);
    return ret;
  }

  async overrideEventTimestampFromParam(idParam: string, at: unknown): Promise<{ ok: boolean }> {
    const eventId = Number(idParam);
    if (!Number.isInteger(eventId) || eventId <= 0) {
      return { ok: false };
    }

    const date = new Date(String(at ?? ''));
    if (Number.isNaN(date.getTime())) {
      return { ok: false };
    }

    await this.receiverDb.overrideEventTimestamps(eventId, date);
    this.logger.log(`overrideEventTimestamp eventId=${eventId} at=${date.toISOString()}`);
    return { ok: true };
  }
}
