import { toKoreanTimeString, type AnalyzerPayload } from '@ai-log/shared-contracts';
import { AnalyzerEntity } from 'src/db/analyzer.entity';

export const toAnalysisListItem = (entity: AnalyzerEntity) => {
    return {
        id: entity.id,
        eventId: entity.eventId,
        summary: entity.summary ?? '',
        reason: entity.reason ?? '',
        solutions: entity.solutions ?? '',
        func: entity.funcKey ?? '',
        funcKey: entity.funcKey ?? '',
        severity: entity.severity ?? '',
        service: entity.service ?? '',
        confidence: entity.confidence ?? null,
        actions: Array.isArray(entity.actions) ? entity.actions : [],
        createdAt: toKoreanTimeString(entity.createdAt),
        updatedAt: toKoreanTimeString(entity.updatedAt),
    };
};

export const toAnalysisDetailPayload = (
    entity: AnalyzerEntity,
): Partial<AnalyzerPayload> => {
    return {
        summary: entity.summary ?? undefined,
        reason: entity.reason ?? undefined,
        solutions: entity.solutions ?? undefined,
        func: entity.funcKey ?? undefined,
        severity: entity.severity ?? undefined,
        service: entity.service ?? undefined,
        confidence: entity.confidence ?? undefined,
        actions: Array.isArray(entity.actions) ? entity.actions : [],
    };
};
