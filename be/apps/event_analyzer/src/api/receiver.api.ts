import { Injectable, Logger } from '@nestjs/common';
import { ApiClient } from '@ai-log/http-api';
import type { EventPayload } from '@ai-log/shared-contracts';

export type ReceiverEventListParams = {
  start?: string;
  end?: string;
  status?: string;
  eventIds?: number[];
  startIndex?: number;
  count?: number;
};

export type ReceiverEventListResult = {
  items: EventPayload[];
  pageInfo: {
    totalCount: number;
    count: number;
    index: number;
    hasNext: boolean;
  };
};

@Injectable()
export class ReceiverApi {
  private readonly baseUrl =
    process.env.URL_EVENT_RECEIVER ?? 'http://localhost:3001';
  private readonly timeoutMs = Number(process.env.SERVER_TIMEOUT ?? 500_000);
  private readonly logger = new Logger(ReceiverApi.name);

  constructor(private readonly api: ApiClient) {}

  /**
   * event_receiver로 status 업데이트
   * PATCH /events/:id/status
   * body: { status: string }
   * - 성공: HTTP status 반환
   * - 실패: ApiClient가 ApiError throw
   */
  async patchEventStatus(id: number, status: string): Promise<number> {
    const normalizedStatus = this.normalizeReceiverStatus(status) ?? status;
    const url = `${this.baseUrl}/events/${encodeURIComponent(String(id))}/status`;

    const r = await this.api.requestJson(
      'PATCH',
      url,
      { status: normalizedStatus },
      { timeoutMs: this.timeoutMs },
    );

    return r.status;
  }

  /**
   * event_receiver 이벤트 목록 조회
   * GET /events?start=&end=&status=&eventIds=&startIndex=&count=
   */
  async getEvents(
    params: ReceiverEventListParams = {},
  ): Promise<ReceiverEventListResult> {
    const searchParams = new URLSearchParams();

    if (typeof params.start === 'string' && params.start.trim()) {
      searchParams.set('start', params.start.trim());
    }

    if (typeof params.end === 'string' && params.end.trim()) {
      searchParams.set('end', params.end.trim());
    }

    const normalizedStatus = this.normalizeReceiverStatus(params.status);
    if (normalizedStatus) {
      searchParams.set('status', normalizedStatus);
    }

    if (Array.isArray(params.eventIds) && params.eventIds.length > 0) {
      const ids = params.eventIds
        .map((id) => Number(id))
        .filter((id) => Number.isInteger(id) && id > 0);

      if (ids.length > 0) {
        searchParams.set('eventIds', ids.join(','));
      }
    }

    const startIndex =
      typeof params.startIndex === 'number' && params.startIndex >= 0
        ? params.startIndex
        : 0;

    const count =
      typeof params.count === 'number' && params.count > 0 ? params.count : 50;

    searchParams.set('startIndex', String(startIndex));
    searchParams.set('count', String(count));

    const query = searchParams.toString();
    const url = `${this.baseUrl}/events${query ? `?${query}` : ''}`;

    const r = await this.api.requestJson<any>('GET', url, undefined, {
      timeoutMs: this.timeoutMs,
    });

    const payload = r.data ?? {};
    const items = Array.isArray(payload?.data)
      ? payload.data
      : Array.isArray(payload?.items)
        ? payload.items
        : Array.isArray(payload)
          ? payload
          : [];

    const pageInfoRaw = payload?.pageInfo ?? {};

    if (!Array.isArray(items)) {
      this.logger.warn(`[receiver-api] /events returned non-array items`);
      return {
        items: [],
        pageInfo: {
          totalCount: 0,
          count,
          index: startIndex,
          hasNext: false,
        },
      };
    }

    return {
      items: items.map((item: any) => ({
        id: Number(item?.id),
        eventId:
          Number.isInteger(Number(item?.eventId)) && Number(item?.eventId) > 0
            ? Number(item?.eventId)
            : Number.isInteger(Number(item?.event_id)) && Number(item?.event_id) > 0
              ? Number(item?.event_id)
              : Number(item?.id),
        robotId:
          typeof item?.robotId === 'string'
            ? item.robotId
            : typeof item?.robot_id === 'string'
              ? item.robot_id
              : '',
        status:
          typeof item?.status === 'string'
            ? item.status
            : '',
        errorLogBundle: Array.isArray(item?.errorLogBundle)
          ? item.errorLogBundle
          : Array.isArray(item?.error_log_bundle)
            ? item.error_log_bundle
            : [],
        fullLog: Array.isArray(item?.fullLog)
          ? item.fullLog
          : Array.isArray(item?.full_log)
            ? item.full_log
            : [],
        createdAt:
          typeof item?.createdAt === 'string'
            ? item.createdAt
            : typeof item?.created_at === 'string'
              ? item.created_at
              : '',
        updatedAt:
          typeof item?.updatedAt === 'string'
            ? item.updatedAt
            : typeof item?.updated_at === 'string'
              ? item.updated_at
              : '',
      })),
      pageInfo: {
        totalCount: Number(pageInfoRaw?.totalCount ?? items.length ?? 0),
        count: Number(pageInfoRaw?.count ?? count),
        index: Number(pageInfoRaw?.index ?? startIndex),
        hasNext: Boolean(pageInfoRaw?.hasNext),
      },
    };
  }

  private normalizeReceiverStatus(status?: string): string | undefined {
    if (!status || typeof status !== 'string') return undefined;

    const raw = status.trim();
    if (!raw) return undefined;

    const normalized = raw.toLowerCase();

    const statusMap: Record<string, string> = {
      received: 'RECEIVED',
      prepared: 'PREPARED',
      prepare_failed: 'PREPARE_FAILED',
      analyzing: 'ANALYZING',
      analyzed: 'ANALYZED',
      analyze_failed: 'ANALYZE_FAILED',
      completed: 'COMPLETED',
      failed: 'FAILED',
      no_error: 'NO_ERROR',
    };

    return statusMap[normalized] ?? raw.toUpperCase();
  }
}