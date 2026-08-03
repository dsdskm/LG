import { Injectable, Logger } from '@nestjs/common';
import {
  EventStatus,
  type ActionCandidate,
  type AnalyzerPayload,
  type ErrorLogBundle,
  type SuggestedAction,
} from '@ai-log/shared-contracts';

import { ApiError } from '@ai-log/http-api';

import { DbService } from '../db/db.service';
import { LlmGatewayApi } from 'src/api/llm.api';
import { ReceiverApi } from 'src/api/receiver.api';
import { ActionRunnerApi } from 'src/api/action-runner.api';
import { makeLlmAnalyzeLogsRequest } from 'src/utils/llm-request.maker';
import { toAnalysisDetailPayload, toAnalysisListItem } from 'src/analyzer.mapper';
import { FetchAnalysisParams } from 'src/analyzer.query';

@Injectable()
export class AnalyzerService {
  private readonly logger = new Logger(AnalyzerService.name);

  constructor(
    private readonly db: DbService,
    private readonly llm: LlmGatewayApi,
    private readonly receiverApi: ReceiverApi,
    private readonly actionRunnerApi: ActionRunnerApi,
  ) { }

  async saveIncomingEventSafe(eventId: number): Promise<number | null> {
    try {
      return await this.db.createAnalyzerRecord(eventId);
    } catch (e: any) {
      this.logger.error(
        `[event_analyzer] DB save failed eventId=${eventId} err=${e?.message ?? String(e)}`,
      );
      return null;
    }
  }

  async handleReceiveEvent(
    body: AnalyzerPayload,
  ): Promise<{ ingestStatus: 202 | 204 }> {
    const id = body?.id ?? '-';
    const bundles = Array.isArray((body as any)?.errorLogBundle)
      ? ((body as any).errorLogBundle as ErrorLogBundle[])
      : [];

    this.logger.log(
      `[event_analyzer] received id=${id} bundles=${bundles.length}`,
    );

    bundles.forEach((bundle, index) => {
      this.logger.log(
        `[event_analyzer] errorLogBundle[${index}] id=${id} payload=${JSON.stringify(bundle)}`,
      );
    });

    const analyzerId = await this.saveIncomingEventSafe(body.eventId);

    if (bundles.length === 0) {
      return { ingestStatus: 204 };
    }

    this.runAnalyzeFlowInBackground(body, analyzerId);
    return { ingestStatus: 202 };
  }

  async fetchAnalysis(params: FetchAnalysisParams): Promise<{
    items: ReturnType<typeof toAnalysisListItem>[];
    pageInfo: {
      totalCount: number;
      count: number;
      index: number;
      hasNext: boolean;
    };
  }> {
    const {
      start,
      end,
      startIndex,
      count,
      eventIds,
      func,
      severity,
      summary,
    } = params;

    const result = await this.db.findAllAnalysis({
      start,
      end,
      startIndex,
      count,
      eventIds,
      func,
      severity,
      summary,
    });

    const items = result.items.map((entry) => toAnalysisListItem(entry));

    this.logger.log(
      `fetchAnalysis start=${start ?? '-'} end=${end ?? '-'} startIndex=${startIndex} count=${count} eventIds=${eventIds?.join(',') ?? '-'} func=${func ?? '-'} severity=${severity ?? '-'} summary=${summary ?? '-'} items=${items.length} totalCount=${result.totalCount}`,
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

  async getAnalysisByEventIdParam(
    eventIdParam: string,
  ): Promise<Partial<AnalyzerPayload>> {
    const numericEventId = Number(eventIdParam);
    if (!Number.isInteger(numericEventId) || numericEventId <= 0) {
      return {
        summary: undefined,
        reason: undefined,
        solutions: undefined,
        func: undefined,
        severity: undefined,
        service: undefined,
      };
    }

    return this.getAnalysisByEventId(numericEventId);
  }

  /** 사용자 수동 편집: eventId 기준으로 분석 필드(심각도/Function/분류점수/요약/원인/솔루션)를 갱신 */
  async updateAnalysisByEventId(
    eventIdParam: string,
    body: {
      summary?: unknown;
      reason?: unknown;
      solutions?: unknown;
      func?: unknown;
      severity?: unknown;
      confidence?: unknown;
    },
  ): Promise<{ ok: boolean }> {
    const eventId = Number(eventIdParam);
    if (!Number.isInteger(eventId) || eventId <= 0) return { ok: false };

    const fields: {
      summary?: string;
      reason?: string;
      solutions?: string;
      funcKey?: string;
      severity?: string;
      confidence?: number;
    } = {};

    if (typeof body?.summary === 'string') fields.summary = body.summary;
    if (typeof body?.reason === 'string') fields.reason = body.reason;
    if (typeof body?.solutions === 'string') fields.solutions = body.solutions;
    if (typeof body?.func === 'string') fields.funcKey = body.func;
    if (typeof body?.severity === 'string') fields.severity = body.severity;
    if (
      body?.confidence !== undefined &&
      body?.confidence !== null &&
      Number.isFinite(Number(body.confidence))
    ) {
      fields.confidence = Number(body.confidence);
    }

    const ok = await this.db.updateByEventId(eventId, fields);
    this.logger.log(
      `updateAnalysisByEventId eventId=${eventId} ok=${ok} fields=${Object.keys(fields).join(',') || '-'}`,
    );
    return { ok };
  }

  async getAnalysisByEventId(
    eventId: number,
  ): Promise<Partial<AnalyzerPayload>> {
    const result = await this.db.findByEventId(eventId);

    if (!result) {
      return {
        summary: undefined,
        reason: undefined,
        solutions: undefined,
        func: undefined,
        severity: undefined,
        service: undefined,
      };
    }

    return toAnalysisDetailPayload(result);
  }

  async overrideAnalysisTimestampByEventId(
    eventIdParam: string,
    at: unknown,
  ): Promise<{ ok: boolean }> {
    const eventId = Number(eventIdParam);
    if (!Number.isInteger(eventId) || eventId <= 0) {
      return { ok: false };
    }

    const date = new Date(String(at ?? ''));
    if (Number.isNaN(date.getTime())) {
      return { ok: false };
    }

    const ok = await this.db.overrideAnalysisTimestampsByEventId(eventId, date);
    this.logger.log(
      `overrideAnalysisTimestampByEventId eventId=${eventId} at=${date.toISOString()} ok=${ok}`,
    );
    return { ok };
  }

  runAnalyzeFlowInBackground(body: AnalyzerPayload, analyzerId: number | null) {
    const id = body?.id ?? -1;

    setImmediate(() => {
      void this.runAnalyzeFlow(body, analyzerId).catch((e) => {
        this.logger.error(
          `[event_analyzer] background fatal id=${id} err=${e?.message ?? String(e)}`,
        );
      });
    });
  }

  private async runAnalyzeFlow(
    body: AnalyzerPayload,
    analyzerId: number | null,
  ): Promise<void> {
    this.logger.log(
      `runAnalyzeFlow started id=${body.id} analyzerId=${analyzerId}`,
    );

    const eventId = body.eventId;
    const bundles = Array.isArray(body?.errorLogBundle)
      ? body.errorLogBundle
      : [];

    if (bundles.length === 0) return;

    let activeProvider: Awaited<ReturnType<LlmGatewayApi['getActiveProvider']>> = null;
    try {
      activeProvider = await this.llm.getActiveProvider();
    } catch (e: any) {
      this.logger.error(
        `runAnalyzeFlow active provider lookup failed id=${eventId} err=${e?.message ?? String(e)}`,
      );
    }
    this.logger.log(
      `runAnalyzeFlow activeProvider=${activeProvider} id=${eventId}`,
    );

    if (activeProvider === 'off') {
      if (analyzerId) {
        await this.db.updateAnalyzerFullResult(analyzerId, {
          summary: '',
          reason: '',
          solutions: '',
          funcKey: '',
          severity: '',
          service: 'off',
          actions: [],
        });
      }

      await this.patchStatusSafe(eventId, EventStatus.PREPARED);
      this.logger.log(
        `runAnalyzeFlow llm off(active) -> keep PREPARED id=${eventId}`,
      );
      return;
    }

    await this.patchStatusSafe(eventId, EventStatus.ANALYZING);

    try {
      const llmReq = makeLlmAnalyzeLogsRequest(body);

      // ── Stage1: 분류 (func + confidence) ──────────────────────────────
      const classifyResult = await this.llm.classifyLogs(llmReq);

      if (this.isLlmOff(classifyResult)) {
        await this.storeOffResult(analyzerId);
        await this.patchStatusSafe(eventId, EventStatus.PREPARED);
        this.logger.log(`runAnalyzeFlow llm off(classify) -> PREPARED id=${eventId}`);
        return;
      }

      const classifyNode = this.resolveLlmNode(classifyResult);
      const rawClassifiedFunc = String(classifyNode?.func ?? '').trim();
      const confidence = this.normalizeConfidence(classifyNode?.confidence);

      // 분류 신뢰도가 0.5 이하이거나 func 미분류면 UNKNOWN으로 강등한다.
      // UNKNOWN은 후속 액션 후보를 조회하지 않는다(빈 func로 전체 액션이 새어 나가
      // 기능과 무관한 추천이 깔리는 문제 방지).
      const isUnknownFunc =
        !rawClassifiedFunc ||
        (typeof confidence === 'number' && confidence <= 0.5);
      const classifiedFunc = isUnknownFunc ? 'UNKNOWN' : rawClassifiedFunc;

      this.logger.log(
        `runAnalyzeFlow classify id=${eventId} func=${classifiedFunc} rawFunc=${rawClassifiedFunc || '-'} confidence=${confidence ?? '-'} unknown=${isUnknownFunc}`,
      );

      const actionCandidates = isUnknownFunc
        ? []
        : await this.actionRunnerApi.listActionCandidates(classifiedFunc);
      this.logger.log(
        `runAnalyzeFlow actionCandidates id=${eventId} func=${classifiedFunc} count=${actionCandidates.length}`,
      );

      // ── Stage2: 분석 (분류된 func 기준 공용+기능별 프롬프트 합성 + 후속 액션 후보) ──
      const llmResult = await this.llm.postLogs({
        ...llmReq,
        func: classifiedFunc,
        actions: actionCandidates,
      });

      if (this.isLlmOff(llmResult)) {
        await this.storeOffResult(analyzerId);
        await this.patchStatusSafe(eventId, EventStatus.PREPARED);
        this.logger.log(`runAnalyzeFlow llm off(analyze) -> PREPARED id=${eventId}`);
        return;
      }

      this.logger.log(
        `runAnalyzeFlow llm done id=${eventId} llmStatus=${llmResult.status}`,
      );

      const payload = this.extractAnalysisPayload(llmResult);
      const summary = this.pickField(payload, 'summary');
      const reason = this.pickField(payload, 'reason');
      const solutions =
        this.pickField(payload, 'solutions') ?? this.pickField(payload, 'solution');
      const func = isUnknownFunc
        ? 'UNKNOWN'
        : (this.pickField(payload, 'func') ??
          this.pickField(payload, 'issueFunctionality') ??
          (classifiedFunc || undefined));
      const severity =
        this.pickField(payload, 'severity') ??
        this.pickField(payload, 'issueSeverity');
      const normalizedSeverity = this.normalizeSeverity(severity);
      const service = this.extractLlmService(llmResult, activeProvider);
      const actions = isUnknownFunc
        ? []
        : this.resolveSuggestedActions(payload?.actions, actionCandidates);

      this.logger.log(
        `runAnalyzeFlow suggestedActions id=${eventId} count=${actions.length} keys=${actions.map((a) => a.key).join(',') || '-'}`,
      );

      // 진행현황: eventId별 분석 결과가 비었는지 한 줄로(빈 summary 추적용)
      this.logger.log(
        `runAnalyzeFlow parsed id=${eventId} func=${func ?? classifiedFunc} sev=${normalizedSeverity ?? severity ?? '-'} summaryLen=${summary?.length ?? 0} reasonLen=${reason?.length ?? 0} solLen=${solutions?.length ?? 0}`,
      );

      if (analyzerId) {
        await this.db.updateAnalyzerFullResult(analyzerId, {
          summary,
          reason,
          solutions,
          funcKey: func ?? classifiedFunc,
          severity: normalizedSeverity ?? severity,
          service,
          confidence,
          actions,
        });

        this.logger.log(`updatedAnalyzerFullResult analyzerId=${analyzerId}`);
      }

      await this.patchStatusSafe(eventId, EventStatus.ANALYZED);
      await this.actionRunnerApi.postEventId(eventId);
    } catch (e: any) {
      const errDetail = this.describeError(e);
      this.logger.error(
        `runAnalyzeFlow failed id=${eventId} ${errDetail}`,
      );
      this.logger.debug(e?.stack ?? '');

      // 분석 실패 원인을 요약에 저장해 FE(robot/ailog)에서 노출되게 한다.
      if (analyzerId) {
        try {
          await this.db.updateAnalyzerResult(
            analyzerId,
            `분석 실패: ${errDetail}`,
          );
        } catch (saveErr: any) {
          this.logger.error(
            `runAnalyzeFlow failure-summary save failed id=${eventId} err=${saveErr?.message ?? String(saveErr)}`,
          );
        }
      }

      await this.patchStatusSafe(eventId, EventStatus.ANALYZE_FAILED);
    }
  }

  // 분석 실패 원인을 사람이 읽을 수 있는 한 줄로. ApiError면 호출 대상/상태/응답본문까지 노출.
  private describeError(e: any): string {
    if (e instanceof ApiError) {
      const body = e.bodyPreview ? ` body=${e.bodyPreview}` : '';
      return `${e.message} (status=${e.status} url=${e.url})${body}`;
    }
    return e?.message ?? String(e);
  }

  private async patchStatusSafe(
    id: number,
    status: EventStatus,
  ): Promise<void> {
    try {
      await this.receiverApi.patchEventStatus(id, status);
    } catch (e: any) {
      this.logger.error(
        `[event_analyzer] receiver status patch failed id=${id} status=${status} err=${e?.message ?? String(e)}`,
      );
    }
  }

  private async storeOffResult(analyzerId: number | null): Promise<void> {
    if (!analyzerId) return;
    await this.db.updateAnalyzerFullResult(analyzerId, {
      summary: '',
      reason: '',
      solutions: '',
      funcKey: '',
      severity: '',
      service: 'off',
      confidence: null,
      actions: [],
    });
  }

  /**
   * LLM이 제안한 actions를 후보 목록과 대조해 정규화한다.
   * - 후보에 없는 key(환각)는 제거하고, name은 후보의 값으로 강제(신뢰 가능한 표시명).
   * - reason은 LLM이 준 문자열을 사용.
   */
  private resolveSuggestedActions(
    raw: unknown,
    candidates: ActionCandidate[],
  ): SuggestedAction[] {
    if (!Array.isArray(raw)) return [];

    const nameByKey = new Map(
      candidates.map((c) => [String(c.key).trim(), String(c.name ?? '').trim()]),
    );

    const seen = new Set<string>();
    const result: SuggestedAction[] = [];

    for (const item of raw) {
      const key = String((item as any)?.key ?? '').trim();
      if (!key || !nameByKey.has(key) || seen.has(key)) continue;

      const reason = String((item as any)?.reason ?? '').trim();
      result.push({
        key,
        name: nameByKey.get(key) || key,
        reason,
      });
      seen.add(key);
    }

    return result;
  }

  /**
   * llm_gateway 응답의 ApiResponse 중첩({code,data:{code,data:{...}}})을 풀어
   * 게이트웨이 서비스 결과 노드({ ok, status, text, func?, off?, service, ... })를 반환
   */
  private resolveLlmNode(result: any): any {
    let node = result?.data ?? result;
    for (let i = 0; i < 5; i++) {
      if (
        node &&
        typeof node === 'object' &&
        'data' in node &&
        node.data &&
        typeof node.data === 'object' &&
        !('text' in node)
      ) {
        node = node.data;
      } else {
        break;
      }
    }
    return node;
  }

  /** 게이트웨이 결과 노드에서 LLM JSON(text)을 파싱해 노드 필드와 병합 */
  private extractAnalysisPayload(result: any): Record<string, any> {
    const node = this.resolveLlmNode(result) ?? {};
    const parsed = this.parseJsonText(node?.text);
    return { ...(node ?? {}), ...(parsed ?? {}) };
  }

  private parseJsonText(text: unknown): Record<string, any> | null {
    if (typeof text !== 'string') return null;
    let body = text.trim();
    const codeBlockMatch = body.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
    if (codeBlockMatch) body = codeBlockMatch[1].trim();
    try {
      const parsed = JSON.parse(body);
      return parsed && typeof parsed === 'object' ? parsed : null;
    } catch {
      return null;
    }
  }

  private pickField(payload: Record<string, any>, key: string): string | undefined {
    const v = payload?.[key];
    if (typeof v === 'string' && v.trim().length > 0) return v.trim();
    if (typeof v === 'number') return String(v);
    return undefined;
  }

  private normalizeConfidence(value: unknown): number | undefined {
    const n = Number(value);
    if (!Number.isFinite(n)) return undefined;
    const clamped = Math.min(1, Math.max(0, n));
    return Math.round(clamped * 100) / 100;
  }

  private extractLlmService(result: any, fallback?: string | null): string {
    const node = this.resolveLlmNode(result);
    const service = node?.service ?? node?.provider;
    if (typeof service === 'string' && service.trim()) {
      return service.trim();
    }
    if (typeof fallback === 'string' && fallback.trim()) {
      return fallback.trim();
    }
    return 'unknown';
  }

  private isLlmOff(result: any): boolean {
    const node = this.resolveLlmNode(result);
    return node?.off === true || result?.data?.off === true || result?.off === true;
  }

  private normalizeSeverity(raw?: string): string | undefined {
    if (!raw) return undefined;

    const s = raw.trim().toLowerCase();

    if (s === 'high' || s === '상' || s === '높음' || s === 'critical') {
      return 'high';
    }

    if (s === 'medium' || s === '중' || s === '보통' || s === 'normal') {
      return 'medium';
    }

    if (s === 'low' || s === '하' || s === '낮음' || s === 'minor') {
      return 'low';
    }

    return undefined;
  }
}
``