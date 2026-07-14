import { toKoreanTimeString, type EventPayload } from '@ai-log/shared-contracts';
import { EventEntity } from 'src/db/event.entity';

export const toEventPayload = (
    entity: EventEntity,
    options: { includeFullLog?: boolean } = {},
): EventPayload => {
    const { includeFullLog = true } = options;

    return {
        id: entity.id,
        eventId: entity.id,
        robotId: entity.robotId,
        status: entity.status,
        errorLogBundle: (entity.errorLogBundle ?? []) as any,
        // 원문 전체는 단건 조회에서만 포함 (목록 응답 비대화 방지)
        ...(includeFullLog ? { fullLog: (entity.fullLog ?? []) as any } : {}),
        createdAt: toKoreanTimeString(entity.createdAt),
        updatedAt: toKoreanTimeString(entity.updatedAt),
    };
};