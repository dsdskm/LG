import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as nodemailer from 'nodemailer';
import process from 'node:process';
import { toKoreanTimeString, type ReportConfig, type ReportSendHistory } from '@ai-log/shared-contracts';

import { ConfigManagerApi } from '../api/config-manager.api';
import { AnalyzerResultEntity } from '../reports/entities/analyzer-result.entity';
import { ReceiverEventEntity } from '../reports/entities/receiver-event.entity';
import { buildReportHtml } from '../reports/utils/report-html.util';
import {
  renderHtmlTemplate,
  renderSubjectTemplate,
} from '../reports/utils/report-template.util';
import { ReportSendHistoryEntity } from '../db/report';

type ReportSendResult = {
  ok: true;
  eventId: number;
  assignees: string[];
  accepted: string[];
  rejected: string[];
};

type ReportPreviewResult = {
  ok: true;
  eventId: number;
  html: string;
};

type ReportSamplePreviewResult = {
  ok: true;
  sample: true;
  html: string;
};

const REPORT_TEMPLATE_DEFAULT_KEY = 'default';

function normalizeStringList(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.map((item) => String(item ?? '').trim()).filter(Boolean);
}

/** KST 기준 사람이 읽기 쉬운 날짜 문자열로 변환 (YYYY-MM-DD HH:mm:ss). */
function toKoreanReadable(value: unknown): string {
  if (!value) return '-';
  // 프로젝트 표준 KST 변환(toKoreanTimeString)을 재사용하되 ISO 표기(T, +09:00)를 제거한다.
  return toKoreanTimeString(value as Date | string | number)
    .replace('T', ' ')
    .replace('+09:00', '')
    .trim();
}

/** 후속 액션 목록을 템플릿/텍스트용 멀티라인 문자열로 변환 ("- 이름: 이유") */
function formatActionsText(actions: unknown): string {
  if (!Array.isArray(actions) || actions.length === 0) return '-';
  const lines = actions
    .map((a: any) => {
      const name = String(a?.name ?? a?.key ?? '').trim();
      if (!name) return '';
      const reason = String(a?.reason ?? '').trim();
      return reason ? `- ${name}: ${reason}` : `- ${name}`;
    })
    .filter(Boolean);
  return lines.length > 0 ? lines.join('\n') : '-';
}

function toHistoryContract(row: ReportSendHistoryEntity): ReportSendHistory {
  return {
    id: row.id,
    eventId: row.eventId,
    funcKey: String(row.funcKey ?? '').trim(),
    toEmails: normalizeStringList(row.toEmails),
    subject: String(row.subject ?? ''),
    html: String(row.html ?? ''),
    status: row.status,
    accepted: normalizeStringList(row.accepted),
    rejected: normalizeStringList(row.rejected),
    errorMessage: String(row.errorMessage ?? ''),
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

@Injectable()
export class ReportsService {
  private readonly logger = new Logger(ReportsService.name);

  constructor(
    private readonly configManagerApi: ConfigManagerApi,
    @InjectRepository(ReceiverEventEntity, 'eventReceiverReadDb')
    private readonly eventRepo: Repository<ReceiverEventEntity>,
    @InjectRepository(AnalyzerResultEntity, 'eventAnalyzerReadDb')
    private readonly analyzerRepo: Repository<AnalyzerResultEntity>,
    @InjectRepository(ReportSendHistoryEntity, 'reportManagerDb')
    private readonly historyRepo: Repository<ReportSendHistoryEntity>,
  ) {}

  async getHistoryAll(): Promise<ReportSendHistory[]> {
    const rows = await this.historyRepo.find({ order: { id: 'DESC' } });
    return rows.map(toHistoryContract);
  }

  async getHistoryById(id: number): Promise<ReportSendHistory> {
    const row = await this.historyRepo.findOne({ where: { id } });
    if (!row) {
      throw new NotFoundException(`report history id=${id} 가 없습니다.`);
    }
    return toHistoryContract(row);
  }

  async getHistoryByEventId(eventId: number): Promise<ReportSendHistory[]> {
    const rows = await this.historyRepo.find({
      where: { eventId },
      order: { id: 'DESC' },
    });
    return rows.map(toHistoryContract);
  }

  async sendByEventId(eventId: number): Promise<ReportSendResult> {
    if (!Number.isInteger(eventId) || eventId <= 0) {
      throw new BadRequestException('eventId는 양의 정수여야 합니다.');
    }

    const { eventRow, analyzerRow } = await this.getReportRows(eventId);

    const assignees = await this.resolveAssignees(analyzerRow.funcKey);
    if (assignees.length === 0) {
      this.logger.warn(
        `[report_manager] eventId=${eventId} 담당자가 없어 메일 발송을 건너뛰고 정상 응답합니다.`,
      );
      return { ok: true, eventId, assignees: [], accepted: [], rejected: [] };
    }

    const from = process.env.MAIL_FROM || process.env.MAIL_USER;
    if (!from) {
      this.logger.warn(
        `[report_manager] eventId=${eventId} MAIL_FROM/MAIL_USER 미설정으로 메일 발송을 건너뛰고 정상 응답합니다.`,
      );
      return { ok: true, eventId, assignees, accepted: [], rejected: [] };
    }

    let transport: ReturnType<typeof nodemailer.createTransport>;
    try {
      transport = this.createTransport();
    } catch (e: any) {
      this.logger.warn(
        `[report_manager] eventId=${eventId} 메일 설정 미비로 발송을 건너뛰고 정상 응답합니다: ${e?.message ?? String(e)}`,
      );
      return { ok: true, eventId, assignees, accepted: [], rejected: [] };
    }

    const subjectPrefix = process.env.MAIL_SUBJECT_PREFIX ?? '[AI-LOG REPORT]';
    const templateVars = await this.buildTemplateVariables(eventRow, analyzerRow);
    const templateConfig = await this.resolveReportTemplate(analyzerRow.funcKey);

    const subject = templateConfig
      ? renderSubjectTemplate(templateConfig.subjectTemplate, templateVars)
      : `${subjectPrefix} eventId=${eventId} func=${analyzerRow.funcKey ?? '-'}`;

    const text = this.buildTextReport(eventRow, analyzerRow);
    const html = templateConfig
      ? renderHtmlTemplate(templateConfig.htmlTemplate, templateVars)
      : buildReportHtml(eventRow, analyzerRow);

    try {
      const info = await transport.sendMail({
        from,
        to: assignees.join(', '),
        subject,
        text,
        html,
      });

      const accepted = Array.isArray(info.accepted)
        ? info.accepted.map(String)
        : [];
      const rejected = Array.isArray(info.rejected)
        ? info.rejected.map(String)
        : [];

      this.logger.log(
        `[report_manager] mail sent eventId=${eventId} assignees=${assignees.join(',')} accepted=${accepted.join(',')} rejected=${rejected.join(',')}`,
      );

      await this.saveHistory({
        eventId,
        funcKey: analyzerRow.funcKey,
        toEmails: assignees,
        subject,
        html,
        status: 'sent',
        accepted,
        rejected,
        errorMessage: '',
      });

      return {
        ok: true,
        eventId,
        assignees,
        accepted,
        rejected,
      };
    } catch (error: any) {
      await this.saveHistory({
        eventId,
        funcKey: analyzerRow.funcKey,
        toEmails: assignees,
        subject,
        html,
        status: 'failed',
        accepted: [],
        rejected: [],
        errorMessage: error?.message ?? String(error),
      });

      this.logger.error(
        `[report_manager] mail send failed eventId=${eventId} err=${error?.message ?? String(error)}`,
      );
      // 발송 실패해도 API 자체는 정상 응답한다.
      return { ok: true, eventId, assignees, accepted: [], rejected: [] };
    }
  }

  async previewByEventId(eventId: number): Promise<ReportPreviewResult> {
    if (!Number.isInteger(eventId) || eventId <= 0) {
      throw new BadRequestException('eventId는 양의 정수여야 합니다.');
    }

    const { eventRow, analyzerRow } = await this.getReportRows(eventId);
    const templateVars = await this.buildTemplateVariables(eventRow, analyzerRow);
    const templateConfig = await this.resolveReportTemplate(analyzerRow.funcKey);

    return {
      ok: true,
      eventId,
      html: templateConfig
        ? renderHtmlTemplate(templateConfig.htmlTemplate, templateVars)
        : buildReportHtml(eventRow, analyzerRow),
    };
  }

  private async resolveReportTemplate(funcKey?: string): Promise<ReportConfig | null> {
    const normalizedFuncKey = String(funcKey ?? '').trim();
    if (normalizedFuncKey) {
      const matched = await this.configManagerApi.getReportConfigByKey(normalizedFuncKey);
      if (matched?.enabled) {
        return matched;
      }
    }

    const defaultTemplate = await this.configManagerApi.getReportConfigByKey(
      REPORT_TEMPLATE_DEFAULT_KEY,
    );
    if (defaultTemplate?.enabled) {
      return defaultTemplate;
    }

    return null;
  }

  /** 해당 func 의 담당자 목록을 템플릿용 멀티라인 텍스트로. ("- 이름 (팀) <email>") */
  private async buildAssigneeText(funcKey: string): Promise<string> {
    try {
      const all = await this.configManagerApi.getAssignees();
      const key = String(funcKey ?? '').trim().toLowerCase();
      const filtered = key
        ? all.filter((a) => String(a.func ?? '').trim().toLowerCase() === key)
        : all;
      if (filtered.length === 0) return '-';
      return filtered
        .map((a) => {
          const team = a.team ? ` (${a.team})` : '';
          const email = a.email ? ` <${a.email}>` : '';
          return `- ${a.name}${team}${email}`;
        })
        .join('\n');
    } catch {
      return '-';
    }
  }

  private async buildTemplateVariables(
    eventRow: ReceiverEventEntity,
    analyzerRow: AnalyzerResultEntity,
  ): Promise<Record<string, string>> {
    const assignee = await this.buildAssigneeText(analyzerRow.funcKey ?? '');
    return {
      eventId: String(eventRow.id ?? ''),
      robotId: String(eventRow.robotId ?? ''),
      status: String(eventRow.status ?? ''),
      funcKey: String(analyzerRow.funcKey ?? '-'),
      severity: String(analyzerRow.severity ?? '-'),
      service: String(analyzerRow.service ?? '-'),
      // "분석 LLM" 표기용. 템플릿의 {{provider}}와 매칭.
      provider: String(analyzerRow.service ?? '-'),
      createdAt: toKoreanReadable(eventRow.createdAt),
      summary: String(analyzerRow.summary ?? '-'),
      reason: String(analyzerRow.reason ?? '-'),
      solutions: String(analyzerRow.solutions ?? '-'),
      actions: formatActionsText(analyzerRow.actions),
      assignee,
    };
  }

  private async saveHistory(input: {
    eventId: number;
    funcKey?: string | null;
    toEmails: string[];
    subject: string;
    html: string;
    status: 'sent' | 'failed';
    accepted: string[];
    rejected: string[];
    errorMessage: string;
  }): Promise<void> {
    try {
      const row = this.historyRepo.create({
        eventId: input.eventId,
        funcKey: String(input.funcKey ?? ''),
        toEmails: normalizeStringList(input.toEmails),
        subject: String(input.subject ?? ''),
        html: String(input.html ?? ''),
        status: input.status,
        accepted: normalizeStringList(input.accepted),
        rejected: normalizeStringList(input.rejected),
        errorMessage: String(input.errorMessage ?? ''),
      });

      await this.historyRepo.save(row);
    } catch (error: any) {
      this.logger.error(
        `[report_manager] report history 저장 오류 eventId=${input.eventId}: ${error?.message ?? String(error)}`,
      );
    }
  }

  async previewSampleHtml(): Promise<ReportSamplePreviewResult> {
    const sampleEvent = {
      id: 101,
      robotId: 'robot-a17',
      status: 'analyzed',
      errorLogBundle: null,
      createdAt: new Date('2026-05-17T09:30:00.000Z'),
      updatedAt: new Date('2026-05-17T09:35:00.000Z'),
    } as ReceiverEventEntity;

    const sampleAnalyzer = {
      id: 501,
      eventId: 101,
      summary:
        '결제 승인 단계에서 외부 API 지연으로 응답 시간이 임계치를 초과했습니다.',
      reason: '네트워크 구간의 순간 지연과 재시도 정책 미흡이 동시에 발생했습니다.',
      solutions:
        '1) 외부 API 호출 타임아웃/재시도 전략 분리\n2) 회로 차단기(circuit breaker) 설정\n3) 지연 발생 시 즉시 알림 임계값 하향 조정',
      funcKey: 'PAYMENT_APPROVAL',
      severity: 'high',
      service: 'payment-gateway',
      actions: [
        { key: 'retry-payment', name: '결제 재시도', reason: '일시적 외부 API 지연으로 재시도 시 성공 가능성이 높습니다.' },
        { key: 'notify-oncall', name: '담당자 알림', reason: '임계치 초과가 반복되면 온콜 담당자 확인이 필요합니다.' },
      ],
      createdAt: new Date('2026-05-17T09:31:00.000Z'),
      updatedAt: new Date('2026-05-17T09:35:00.000Z'),
    } as AnalyzerResultEntity;

    const templateVars = await this.buildTemplateVariables(sampleEvent, sampleAnalyzer);
    const templateConfig = await this.resolveReportTemplate(sampleAnalyzer.funcKey);

    return {
      ok: true,
      sample: true,
      html: templateConfig
        ? renderHtmlTemplate(templateConfig.htmlTemplate, templateVars)
        : buildReportHtml(sampleEvent, sampleAnalyzer),
    };
  }

  private async getReportRows(eventId: number): Promise<{
    eventRow: ReceiverEventEntity;
    analyzerRow: AnalyzerResultEntity;
  }> {
    const [eventRow, analyzerRow] = await Promise.all([
      this.eventRepo.findOne({ where: { id: eventId } }),
      this.analyzerRepo.findOne({
        where: { eventId },
        order: { updatedAt: 'DESC' },
      }),
    ]);

    // 데이터가 없어도 404 로 막지 않고 빈 값으로 채워 다음 단계로 진행한다.
    if (!eventRow) {
      this.logger.warn(
        `[report_manager] event_receiver_db에 eventId=${eventId} 데이터가 없어 빈 값으로 진행합니다.`,
      );
    }
    if (!analyzerRow) {
      this.logger.warn(
        `[report_manager] event_analyzer_db에 eventId=${eventId} 분석 데이터가 없어 빈 값으로 진행합니다.`,
      );
    }

    return {
      eventRow: eventRow ?? this.emptyEventRow(eventId),
      analyzerRow: analyzerRow ?? this.emptyAnalyzerRow(eventId),
    };
  }

  /** 이벤트 데이터가 없을 때 사용하는 빈 이벤트 row */
  private emptyEventRow(eventId: number): ReceiverEventEntity {
    return {
      id: eventId,
      robotId: '',
      status: '',
      errorLogBundle: null,
      createdAt: undefined as unknown as Date,
      updatedAt: undefined as unknown as Date,
    } as ReceiverEventEntity;
  }

  /** 분석 데이터가 없을 때 사용하는 빈 분석 row */
  private emptyAnalyzerRow(eventId: number): AnalyzerResultEntity {
    return {
      id: 0,
      eventId,
      summary: '',
      reason: '',
      solutions: '',
      funcKey: '',
      severity: '',
      service: '',
      actions: [],
      createdAt: undefined as unknown as Date,
      updatedAt: undefined as unknown as Date,
    } as AnalyzerResultEntity;
  }

  private createTransport() {
    const host = process.env.MAIL_HOST;
    const port = Number(process.env.MAIL_PORT ?? 587);
    const secure =
      String(process.env.MAIL_SECURE ?? 'false').toLowerCase() === 'true';
    const user = process.env.MAIL_USER;
    const pass = process.env.MAIL_PASS;

    if (!host || !user || !pass) {
      throw new BadRequestException(
        'MAIL_HOST, MAIL_USER, MAIL_PASS 환경변수가 필요합니다.',
      );
    }

    return nodemailer.createTransport({
      host,
      port,
      secure,
      auth: {
        user,
        pass,
      },
    });
  }

  private async resolveAssignees(funcKey?: string): Promise<string[]> {
    const set = new Set<string>();

    // if (funcKey?.trim()) {
    //   const func = await this.configManagerApi.getAssigneesByFuncKey(funcKey.trim());
    //   for (const assignee of Array.isArray(func?.assignees)
    //     ? func.assignees
    //     : []) {
    //     const normalized = String(assignee?.email ?? '').trim();
    //     if (normalized) set.add(normalized);
    //   }
    // }

    return Array.from(set);
  }

  private buildTextReport(
    eventRow: ReceiverEventEntity,
    analyzerRow: AnalyzerResultEntity,
  ): string {
    return [
      `eventId: ${eventRow.id}`,
      `robotId: ${eventRow.robotId}`,
      `status: ${eventRow.status}`,
      `funcKey: ${analyzerRow.funcKey ?? '-'}`,
      `severity: ${analyzerRow.severity ?? '-'}`,
      `service: ${analyzerRow.service ?? '-'}`,
      `createdAt: ${eventRow.createdAt ? toKoreanTimeString(eventRow.createdAt) : '-'}`,
      '',
      `summary: ${analyzerRow.summary ?? '-'}`,
      '',
      `reason: ${analyzerRow.reason ?? '-'}`,
      '',
      `solutions: ${analyzerRow.solutions ?? '-'}`,
      '',
      `actions:\n${formatActionsText(analyzerRow.actions)}`,
    ].join('\n');
  }
}
