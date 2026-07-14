import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ReportConfigEntity } from '../db/report-config.entity';

const REPORT_CONFIG_SINGLETON_KEY = 'default';

export type ReportConfigOutput = {
  id: number;
  subjectTemplate: string;
  htmlTemplate: string;
  description: string;
  enabled: boolean;
  createdAt: Date;
  updatedAt: Date;
};

export type ReportConfigUpsertInput = {
  subjectTemplate: string;
  htmlTemplate: string;
  description?: string;
  enabled?: boolean;
};

function toContract(row: ReportConfigEntity): ReportConfigOutput {
  return {
    id: row.id,
    subjectTemplate: String(row.subjectTemplate ?? ''),
    htmlTemplate: String(row.htmlTemplate ?? ''),
    description: String(row.description ?? ''),
    enabled: Boolean(row.enabled),
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

function normalizeUpsertInput(input: ReportConfigUpsertInput): Required<ReportConfigUpsertInput> {
  const subjectTemplate = String(input?.subjectTemplate ?? '').trim();
  const htmlTemplate = String(input?.htmlTemplate ?? '').trim();
  const description = String(input?.description ?? '').trim();
  const enabled = input?.enabled ?? true;

  if (!subjectTemplate) {
    throw new BadRequestException('subjectTemplate이 필요합니다.');
  }

  if (!htmlTemplate) {
    throw new BadRequestException('htmlTemplate이 필요합니다.');
  }

  return {
    subjectTemplate,
    htmlTemplate,
    description,
    enabled: Boolean(enabled),
  };
}

function getDefaultSubjectTemplate() {
  return '[{eventId}]{summary}';
}

function getDefaultHtmlTemplate() {
  // 치환 토큰은 단일({token})·이중({{token}}) 중괄호 모두 지원(report_manager/report-template.util.ts).
  // 사용 가능한 변수: eventId, robotId, status, funcKey, severity, service,
  //                 provider, createdAt, summary, reason, solutions, actions
  return `
<div style="margin:0;padding:24px 12px;background:#eef1f5;font-family:'Apple SD Gothic Neo','Malgun Gothic','Segoe UI',sans-serif;color:#1f2933;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;">
    <tr><td align="center">
      <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="width:600px;max-width:600px;border-collapse:collapse;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 10px 30px rgba(15,23,42,0.12);">
        <tr><td style="padding:28px 32px;background:linear-gradient(135deg,#0b2a4a 0%,#1b6ca8 100%);">
          <div style="font-size:11px;letter-spacing:0.18em;color:#9ec5e6;font-weight:600;">AI LOG REPORT</div>
          <div style="margin-top:8px;font-size:24px;font-weight:700;color:#ffffff;line-height:1.25;">이슈 분석 리포트</div>
          <div style="margin-top:10px;font-size:13px;color:#cfe0ef;">#{eventId} · {robotId}</div>
        </td></tr>
        <tr><td style="padding:24px 32px 8px;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:separate;border-spacing:0;">
            <tr>
              <td style="padding:0 0 14px;width:50%;vertical-align:top;">
                <div style="font-size:11px;color:#8a94a6;letter-spacing:0.04em;">기능</div>
                <div style="margin-top:4px;font-size:15px;font-weight:700;color:#10243b;">{funcKey}</div>
              </td>
              <td style="padding:0 0 14px;width:50%;vertical-align:top;">
                <div style="font-size:11px;color:#8a94a6;letter-spacing:0.04em;">심각도</div>
                <div style="margin-top:4px;"><span style="display:inline-block;padding:3px 12px;border-radius:999px;background:#fdecec;color:#c0392b;font-size:13px;font-weight:700;">{severity}</span></div>
              </td>
            </tr>
            <tr>
              <td style="padding:0;width:50%;vertical-align:top;">
                <div style="font-size:11px;color:#8a94a6;letter-spacing:0.04em;">분석 LLM</div>
                <div style="margin-top:4px;font-size:15px;font-weight:600;color:#10243b;">{provider}</div>
              </td>
              <td style="padding:0;width:50%;vertical-align:top;">
                <div style="font-size:11px;color:#8a94a6;letter-spacing:0.04em;">생성 날짜</div>
                <div style="margin-top:4px;font-size:15px;font-weight:600;color:#10243b;">{createdAt}</div>
              </td>
            </tr>
          </table>
        </td></tr>
        <tr><td style="padding:8px 32px;"><div style="height:1px;background:#eceff3;"></div></td></tr>
        <tr><td style="padding:8px 32px 4px;">
          <div style="font-size:12px;font-weight:700;color:#1b6ca8;letter-spacing:0.03em;border-left:3px solid #1b6ca8;padding-left:8px;">이슈 원인</div>
          <p style="margin:10px 0 0;font-size:14px;line-height:1.7;color:#33414f;white-space:pre-wrap;">{summary}</p>
        </td></tr>
        <tr><td style="padding:18px 32px 4px;">
          <div style="font-size:12px;font-weight:700;color:#1b6ca8;letter-spacing:0.03em;border-left:3px solid #1b6ca8;padding-left:8px;">솔루션</div>
          <p style="margin:10px 0 0;font-size:14px;line-height:1.7;color:#33414f;white-space:pre-wrap;">{solutions}</p>
        </td></tr>
        <tr><td style="padding:18px 32px 28px;">
          <div style="font-size:12px;font-weight:700;color:#1b6ca8;letter-spacing:0.03em;border-left:3px solid #1b6ca8;padding-left:8px;">후속 추천 액션</div>
          <div style="margin-top:10px;padding:16px 18px;background:#f3f8fd;border:1px solid #d6e6f5;border-radius:12px;">
            <p style="margin:0;font-size:14px;line-height:1.8;color:#10406b;white-space:pre-wrap;">{actions}</p>
          </div>
        </td></tr>
        <tr><td style="padding:16px 32px;background:#f7f9fb;border-top:1px solid #eceff3;">
          <div style="font-size:12px;color:#9aa4b2;">본 메일은 AI Log System에서 자동 발송되었습니다.</div>
        </td></tr>
      </table>
    </td></tr>
  </table>
</div>
  `.trim();
}

@Injectable()
export class ReportConfigService {
  private readonly logger = new Logger(ReportConfigService.name);

  constructor(
    @InjectRepository(ReportConfigEntity)
    private readonly reportConfigRepo: Repository<ReportConfigEntity>,
  ) {}

  /**
   * 현재 싱글톤 설정 row 조회
   * 없으면 기본 템플릿으로 자동 생성
   */
  async getConfig(): Promise<ReportConfigOutput> {
    try {
      let row = await this.reportConfigRepo.findOne({
        where: { singletonKey: REPORT_CONFIG_SINGLETON_KEY },
      });

      if (!row) {
        row = this.reportConfigRepo.create({
          singletonKey: REPORT_CONFIG_SINGLETON_KEY,
          subjectTemplate: getDefaultSubjectTemplate(),
          htmlTemplate: getDefaultHtmlTemplate(),
          description: '기본 리포트 템플릿',
          enabled: true,
        });

        row = await this.reportConfigRepo.save(row);
      }

      return toContract(row);
    } catch (error: any) {
      this.logger.error(
        `[report_config] singleton config 조회 오류: ${error?.message ?? String(error)}`,
      );
      throw new InternalServerErrorException(
        '리포트 설정 조회 중 오류가 발생했습니다.',
      );
    }
  }

  /**
   * 싱글톤 설정 upsert
   * - row 없으면 생성
   * - 있으면 수정
   */
  async upsertConfig(input: ReportConfigUpsertInput): Promise<ReportConfigOutput> {
    const normalized = normalizeUpsertInput(input);

    try {
      let row = await this.reportConfigRepo.findOne({
        where: { singletonKey: REPORT_CONFIG_SINGLETON_KEY },
      });

      if (!row) {
        row = this.reportConfigRepo.create({
          singletonKey: REPORT_CONFIG_SINGLETON_KEY,
          subjectTemplate: normalized.subjectTemplate,
          htmlTemplate: normalized.htmlTemplate,
          description: normalized.description,
          enabled: normalized.enabled,
        });
      } else {
        row.subjectTemplate = normalized.subjectTemplate;
        row.htmlTemplate = normalized.htmlTemplate;
        row.description = normalized.description;
        row.enabled = normalized.enabled;
      }

      const saved = await this.reportConfigRepo.save(row);
      return toContract(saved);
    } catch (error: any) {
      this.logger.error(
        `[report_config] singleton config upsert 오류: ${error?.message ?? String(error)}`,
      );
      throw new InternalServerErrorException(
        '리포트 설정 저장 중 오류가 발생했습니다.',
      );
    }
  }
}