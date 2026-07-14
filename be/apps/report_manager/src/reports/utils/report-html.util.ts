import { toKoreanTimeString } from '@ai-log/shared-contracts';
import { AnalyzerResultEntity } from '../entities/analyzer-result.entity';
import { ReceiverEventEntity } from '../entities/receiver-event.entity';

function escapeHtml(value: unknown): string {
  return String(value ?? '-')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function toIsoDate(value: unknown): string {
  if (!value) return '-';
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    // KST 기준 가독 포맷(YYYY-MM-DD HH:mm:ss)
    return toKoreanTimeString(value).replace('T', ' ').replace('+09:00', '').trim();
  }
  return escapeHtml(value);
}

export function buildReportHtml(eventRow: ReceiverEventEntity, analyzerRow: AnalyzerResultEntity): string {
  const eventId = escapeHtml(eventRow.id);
  const robotId = escapeHtml(eventRow.robotId);
  const status = escapeHtml(eventRow.status);
  const funcKey = escapeHtml(analyzerRow.funcKey ?? '-');
  const severity = escapeHtml(analyzerRow.severity ?? '-');
  const service = escapeHtml(analyzerRow.service ?? '-');
  const createdAt = toIsoDate(eventRow.createdAt);

  const summary = escapeHtml(analyzerRow.summary ?? '-');
  const reason = escapeHtml(analyzerRow.reason ?? '-');
  const solutions = escapeHtml(analyzerRow.solutions ?? '-');

  const actions = Array.isArray(analyzerRow.actions) ? analyzerRow.actions : [];
  const actionsHtml =
    actions.length > 0
      ? `<ul style="margin:8px 0 0; padding-left:18px;">${actions
          .map((a) => {
            const name = escapeHtml(a?.name ?? a?.key ?? '-');
            const reasonText = String(a?.reason ?? '').trim();
            const reasonHtml = reasonText
              ? ` <span style="color:#6b7280;">— ${escapeHtml(reasonText)}</span>`
              : '';
            return `<li style="margin:4px 0; font-size:14px; line-height:1.6;"><strong>${name}</strong>${reasonHtml}</li>`;
          })
          .join('')}</ul>`
      : `<p style="margin:8px 0 0; padding:14px; background:#f8fafc; border:1px solid #e5e7eb; border-radius:10px; font-size:14px; color:#6b7280;">제안된 후속 액션이 없습니다.</p>`;

  return `
    <!doctype html>
    <html lang="ko">
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>AI LOG REPORT</title>
      </head>
      <body style="margin:0; padding:24px 0; background:#f3f5f7; font-family:'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; color:#1f2937;">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border-collapse:collapse;">
          <tr>
            <td align="center" style="padding:0 12px;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:760px; border-collapse:collapse; background:#ffffff; border-radius:14px; overflow:hidden; box-shadow:0 8px 28px rgba(17, 24, 39, 0.10);">
                <tr>
                  <td style="padding:24px 28px; background:linear-gradient(120deg, #0d3b66, #145da0); color:#ffffff;">
                    <div style="font-size:12px; letter-spacing:0.08em; opacity:0.88;">AUTOMATED INCIDENT REPORT</div>
                    <h1 style="margin:8px 0 0; font-size:24px; line-height:1.3;">AI LOG REPORT</h1>
                    <div style="margin-top:10px; font-size:14px; opacity:0.95;">eventId ${eventId}</div>
                  </td>
                </tr>
                <tr>
                  <td style="padding:22px 28px 10px;">
                    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border-collapse:separate; border-spacing:0 8px;">
                      <tr>
                        <td style="width:32%; color:#6b7280; font-size:13px;">Robot ID</td>
                        <td style="font-size:14px; font-weight:600; color:#111827;">${robotId}</td>
                      </tr>
                      <tr>
                        <td style="color:#6b7280; font-size:13px;">Status</td>
                        <td style="font-size:14px; font-weight:600; color:#111827;">${status}</td>
                      </tr>
                      <tr>
                        <td style="color:#6b7280; font-size:13px;">Function Key</td>
                        <td style="font-size:14px; font-weight:600; color:#111827;">${funcKey}</td>
                      </tr>
                      <tr>
                        <td style="color:#6b7280; font-size:13px;">Severity</td>
                        <td style="font-size:14px; font-weight:600; color:#111827;">${severity}</td>
                      </tr>
                      <tr>
                        <td style="color:#6b7280; font-size:13px;">Service</td>
                        <td style="font-size:14px; font-weight:600; color:#111827;">${service}</td>
                      </tr>
                      <tr>
                        <td style="color:#6b7280; font-size:13px;">Created At</td>
                        <td style="font-size:14px; font-weight:600; color:#111827;">${createdAt}</td>
                      </tr>
                    </table>
                  </td>
                </tr>
                <tr>
                  <td style="padding:4px 28px 28px;">
                    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border-collapse:collapse;">
                      <tr>
                        <td style="padding-top:14px;">
                          <div style="font-size:12px; font-weight:700; letter-spacing:0.06em; color:#145da0; text-transform:uppercase;">Summary</div>
                          <p style="margin:8px 0 0; padding:14px; background:#f8fafc; border:1px solid #e5e7eb; border-radius:10px; font-size:14px; line-height:1.65; white-space:pre-wrap;">${summary}</p>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding-top:14px;">
                          <div style="font-size:12px; font-weight:700; letter-spacing:0.06em; color:#145da0; text-transform:uppercase;">Reason</div>
                          <p style="margin:8px 0 0; padding:14px; background:#f8fafc; border:1px solid #e5e7eb; border-radius:10px; font-size:14px; line-height:1.65; white-space:pre-wrap;">${reason}</p>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding-top:14px;">
                          <div style="font-size:12px; font-weight:700; letter-spacing:0.06em; color:#145da0; text-transform:uppercase;">Solutions</div>
                          <p style="margin:8px 0 0; padding:14px; background:#f8fafc; border:1px solid #e5e7eb; border-radius:10px; font-size:14px; line-height:1.65; white-space:pre-wrap;">${solutions}</p>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding-top:14px;">
                          <div style="font-size:12px; font-weight:700; letter-spacing:0.06em; color:#145da0; text-transform:uppercase;">Recommended Actions</div>
                          ${actionsHtml}
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
                <tr>
                  <td style="padding:12px 28px 24px; border-top:1px solid #e5e7eb; color:#6b7280; font-size:12px;">
                    This is an automated message from AI Log System.
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </body>
    </html>
  `;
}
