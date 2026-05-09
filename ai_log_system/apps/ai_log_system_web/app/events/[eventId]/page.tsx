import type { EventItem } from '@ai-log/shared-contracts';
import {
  getAnalysisSummary,
  getEventById,
} from '../../lib/api';
import { EventDetailContent } from './event-detail-content';

async function validateEventId(eventId: string | undefined): Promise<{ valid: boolean; id?: string }> {
  if (!eventId || eventId === 'null' || eventId === 'undefined') {
    return { valid: false };
  }
  return { valid: true, id: eventId };
}

function ErrorPage({ title, message }: { title: string; message: string }) {
  return (
    <div className="min-h-screen bg-zinc-50 px-6 py-10 dark:bg-slate-950">
      <div className="mx-auto max-w-5xl rounded-[2rem] border border-zinc-200 bg-white/90 p-10 text-center shadow-sm shadow-zinc-200/40 dark:border-zinc-800 dark:bg-slate-900/90">
        <p className="text-xl font-semibold text-zinc-900 dark:text-zinc-100">
          {title}
        </p>
        <p className="mt-4 text-sm text-zinc-500 dark:text-zinc-400">
          {message}
        </p>
      </div>
    </div>
  );
}

export default async function EventDetailPage({
  params,
}: {
  params: Promise<{ eventId: string }>;
}) {
  const { eventId } = await params;
  const validation = await validateEventId(eventId);

  if (!validation.valid) {
    return (
      <ErrorPage
        title="유효한 이벤트 ID가 전달되지 않았습니다."
        message="이벤트 목록에서 다시 시도해주세요."
      />
    );
  }

  const eventResult = await getEventById(validation.id!);
  const event = eventResult.data;
  const isServiceUnavailable = !eventResult.ok && eventResult.status !== 404;
  console.log(`eventResult`, eventResult)

  if (!event) {
    return (
      <ErrorPage
        title={
          isServiceUnavailable
            ? '이벤트 서비스를 연결할 수 없습니다.'
            : '이벤트를 찾을 수 없습니다.'
        }
        message={
          isServiceUnavailable
            ? '이벤트 수신 서버가 실행 중인지 확인하거나 네트워크 연결을 점검해주세요.'
            : '올바른 이벤트 ID인지 확인해주세요.'
        }
      />
    );
  }

  const analysisResult = await getAnalysisSummary(event.id);

  return (
    <EventDetailContent
      event={event}
      analysisResult={analysisResult}
    />
  );
}
