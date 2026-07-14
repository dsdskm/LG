import { Injectable, Logger } from '@nestjs/common';
import {
  toKoreanTimeString,
  type SuggestedAction,
  type ParsedLogLine,
  type ErrorLogBundle,
} from '@ai-log/shared-contracts';
import { DbService } from '../db/db.service';
import { QueryLogsParams } from 'src/query/query';
import { ReceiverApi } from 'src/api/receiver.api';

type ReceiverEventItem = {
  id: number;
  robotId?: string;
  status?: string;
  createdAt?: string;
  updatedAt?: string;
  fullLog?: ParsedLogLine[];
  errorLogBundle?: ErrorLogBundle[];
};

type AnalysisRow = {
  id: number;
  eventId: number;
  summary?: string | null;
  reason?: string | null;
  solutions?: string | null;
  funcKey?: string | null;
  severity?: string | null;
  service?: string | null;
  confidence?: number | null;
  actions?: SuggestedAction[] | null;
  createdAt: Date;
  updatedAt: Date;
};

type QueryLogRow = {
  id: number;
  eventId: number;
  robotId: string;
  status: string;
  summary: string;
  reason: string;
  solutions: string;
  func: string;
  severity: string;
  service: string;
  confidence: number | null;
  actions: SuggestedAction[];
  // 전체 로그 + 분석에 활용된 구간(errorLogBundle: 각 라인에 index 보유)
  fullLog: ParsedLogLine[];
  errorLogBundle: ErrorLogBundle[];
  createdAt: string;
  updatedAt: string;
};

@Injectable()
export class QueryService {
  private readonly logger = new Logger(QueryService.name);

  constructor(
    private readonly analyzerDb: DbService,
    private readonly receiverApi: ReceiverApi,
  ) {}

  async getLogs(params: QueryLogsParams): Promise<{
    items: QueryLogRow[];
    pageInfo: {
      totalCount: number;
      count: number;
      index: number;
      hasNext: boolean;
    };
  }> {
    const hasEventFilters = Boolean(params.start || params.end || params.status);
    const hasAnalysisFilters = Boolean(
      params.severity || params.func || params.summary,
    );
    if (hasEventFilters && hasAnalysisFilters) {
      return this.getLogsByCombinedFilters(params);
    }

    if (hasEventFilters) {
      return this.getLogsByEventSource(params);
    }

    return this.getLogsByAnalysisSource(params);
  }

  /**
   * receiver 기준 페이지네이션
   * - status/start/end 만 있는 경우
   */
  private async getLogsByEventSource(params: QueryLogsParams): Promise<{
    items: QueryLogRow[];
    pageInfo: {
      totalCount: number;
      count: number;
      index: number;
      hasNext: boolean;
    };
  }> {
    const eventPage = await this.receiverApi.getEvents({
      start: params.start,
      end: params.end,
      status: params.status,
      startIndex: params.startIndex,
      count: params.count,
    });

    const eventIds = eventPage.items.map((item) => item.id).filter(Boolean);

    if (eventIds.length === 0) {
      return {
        items: [],
        pageInfo: eventPage.pageInfo,
      };
    }

    const analysisResult = await this.analyzerDb.findAllAnalysis({
      startIndex: 0,
      count: eventIds.length,
      eventIds,
      func: undefined,
      severity: undefined,
      summary: undefined,
      start: undefined,
      end: undefined,
    });

    const analysisMap = new Map<number, AnalysisRow>();
    for (const item of analysisResult.items as AnalysisRow[]) {
      analysisMap.set(item.eventId, item);
    }

    const merged = eventPage.items.map((eventItem) =>
      this.mergeRow(eventItem, analysisMap.get(eventItem.id)),
    );

    this.logger.log(
      `getLogsByEventSource items=${merged.length} totalCount=${eventPage.pageInfo.totalCount}`,
    );

    return {
      items: merged,
      pageInfo: eventPage.pageInfo,
    };
  }

  /**
   * analyzer 기준 페이지네이션
   * - severity/func/summary 만 있는 경우
   * - 필터가 아무것도 없는 경우도 analyzer 기준
   */
  private async getLogsByAnalysisSource(params: QueryLogsParams): Promise<{
    items: QueryLogRow[];
    pageInfo: {
      totalCount: number;
      count: number;
      index: number;
      hasNext: boolean;
    };
  }> {
    const analysisResult = await this.analyzerDb.findAllAnalysis({
      start: params.start,
      end: params.end,
      startIndex: params.startIndex,
      count: params.count,
      eventIds: undefined,
      func: params.func,
      severity: params.severity,
      summary: params.summary,
    });

    const analysisItems = analysisResult.items as AnalysisRow[];
    const eventIds = analysisItems.map((item) => item.eventId).filter(Boolean);

    const receiverItems =
      eventIds.length > 0
        ? (
            await this.receiverApi.getEvents({
              eventIds,
              startIndex: 0,
              count: eventIds.length,
            })
          ).items
        : [];

    const receiverMap = new Map<number, ReceiverEventItem>();
    for (const item of receiverItems) {
      receiverMap.set(item.id, item);
    }

    const merged = analysisItems.map((analysisItem) =>
      this.mergeRow(receiverMap.get(analysisItem.eventId), analysisItem),
    );

    this.logger.log(
      `getLogsByAnalysisSource items=${merged.length} totalCount=${analysisResult.totalCount}`,
    );

    return {
      items: merged,
      pageInfo: {
        totalCount: analysisResult.totalCount,
        count: params.count,
        index: params.startIndex,
        hasNext: analysisResult.hasNext,
      },
    };
  }

  /**
   * event filter + analysis filter 동시 적용
   *
   * 1) receiver에서 start/end/status 기준으로 eventIds 전체 수집
   * 2) analyzer에서 그 eventIds에 대해 severity/func/summary 적용
   * 3) analyzer 기준으로 페이지네이션
   * 4) 현재 페이지 eventIds만 receiver 다시 조회해서 merge
   */
  private async getLogsByCombinedFilters(params: QueryLogsParams): Promise<{
    items: QueryLogRow[];
    pageInfo: {
      totalCount: number;
      count: number;
      index: number;
      hasNext: boolean;
    };
  }> {
    const candidateEventIds = await this.collectAllReceiverEventIds({
      start: params.start,
      end: params.end,
      status: params.status,
    });

    if (candidateEventIds.length === 0) {
      return {
        items: [],
        pageInfo: {
          totalCount: 0,
          count: params.count,
          index: params.startIndex,
          hasNext: false,
        },
      };
    }

    const analysisResult = await this.analyzerDb.findAllAnalysis({
      start: undefined,
      end: undefined,
      startIndex: params.startIndex,
      count: params.count,
      eventIds: candidateEventIds,
      func: params.func,
      severity: params.severity,
      summary: params.summary,
    });

    const analysisItems = analysisResult.items as AnalysisRow[];
    const pageEventIds = analysisItems.map((item) => item.eventId).filter(Boolean);

    const receiverItems =
      pageEventIds.length > 0
        ? (
            await this.receiverApi.getEvents({
              eventIds: pageEventIds,
              start: params.start,
              end: params.end,
              status: params.status,
              startIndex: 0,
              count: pageEventIds.length,
            })
          ).items
        : [];

    const receiverMap = new Map<number, ReceiverEventItem>();
    for (const item of receiverItems) {
      receiverMap.set(item.id, item);
    }

    const merged = analysisItems.map((analysisItem) =>
      this.mergeRow(receiverMap.get(analysisItem.eventId), analysisItem),
    );

    this.logger.log(
      `getLogsByCombinedFilters candidateEventIds=${candidateEventIds.length} items=${merged.length} totalCount=${analysisResult.totalCount}`,
    );

    return {
      items: merged,
      pageInfo: {
        totalCount: analysisResult.totalCount,
        count: params.count,
        index: params.startIndex,
        hasNext: analysisResult.hasNext,
      },
    };
  }

  private mergeRow(
    receiver?: ReceiverEventItem,
    analysis?: AnalysisRow,
  ): QueryLogRow {
    const eventId =
      typeof analysis?.eventId === 'number'
        ? analysis.eventId
        : typeof receiver?.id === 'number'
          ? receiver.id
          : 0;

    const id =
      typeof analysis?.id === 'number'
        ? analysis.id
        : typeof receiver?.id === 'number'
          ? receiver.id
          : eventId;

    const createdAt = receiver?.createdAt
      ? receiver.createdAt
      : analysis?.createdAt instanceof Date
        ? toKoreanTimeString(analysis.createdAt)
        : '';

    const updatedAt = receiver?.updatedAt
      ? receiver.updatedAt
      : analysis?.updatedAt instanceof Date
        ? toKoreanTimeString(analysis.updatedAt)
        : '';

    // 추천 액션은 분석이 끝난 상태(ANALYZED/COMPLETED)에서만 노출한다.
    // 분석중(ANALYZING) 등에는 이전 분석의 액션이 남아 보이지 않도록 빈 배열로 막는다.
    const statusUpper = (receiver?.status ?? '').trim().toUpperCase();
    const analysisDone = statusUpper === 'ANALYZED' || statusUpper === 'COMPLETED';
    const actions =
      analysisDone && Array.isArray(analysis?.actions) ? analysis.actions : [];

    return {
      id,
      eventId,
      robotId: receiver?.robotId ?? '',
      status: receiver?.status ?? '',
      summary: analysis?.summary ?? '',
      reason: analysis?.reason ?? '',
      solutions: analysis?.solutions ?? '',
      func: analysis?.funcKey ?? '',
      severity: analysis?.severity ?? '',
      service: analysis?.service ?? '',
      confidence:
        typeof analysis?.confidence === 'number' ? analysis.confidence : null,
      actions,
      fullLog: Array.isArray(receiver?.fullLog) ? receiver.fullLog : [],
      errorLogBundle: Array.isArray(receiver?.errorLogBundle)
        ? receiver.errorLogBundle
        : [],
      createdAt,
      updatedAt,
    };
  }

  private async collectAllReceiverEventIds(params: {
    start?: string;
    end?: string;
    status?: string;
  }): Promise<number[]> {
    const batchSize = 500;
    let startIndex = 0;
    const ids: number[] = [];

    while (true) {
      const page = await this.receiverApi.getEvents({
        ...params,
        startIndex,
        count: batchSize,
      });

      const pageIds = page.items
        .map((item) => item.id)
        .filter((id): id is number => Number.isInteger(id) && id > 0);

      ids.push(...pageIds);

      if (!page.pageInfo.hasNext || page.items.length === 0) {
        break;
      }

      startIndex += batchSize;
    }

    return Array.from(new Set(ids));
  }
}
