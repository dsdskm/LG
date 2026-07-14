export type FetchAnalysisParams = {
    start?: string;
    end?: string;
    startIndex: number;
    count: number;
    eventIds?: number[];
    func?: string;
    severity?: string;
    summary?: string;
};

const parseString = (value: unknown): string | undefined => {
    if (typeof value !== 'string') return undefined;
    const trimmed = value.trim();
    return trimmed ? trimmed : undefined;
};

const parsePositiveInteger = (
    value: unknown,
    fallback: number,
    options: { allowZero?: boolean } = {},
): number => {
    if (typeof value !== 'string' || !value.trim()) {
        return fallback;
    }

    const num = Number(value);
    if (!Number.isFinite(num)) {
        return fallback;
    }

    if (options.allowZero) {
        return num >= 0 ? num : fallback;
    }

    return num > 0 ? num : fallback;
};

const parseEventIds = (raw: unknown): number[] | undefined => {
    const tokens: string[] = [];

    if (Array.isArray(raw)) {
        for (const value of raw) {
            if (typeof value === 'string') {
                tokens.push(...value.split(','));
            } else if (typeof value === 'number') {
                tokens.push(String(value));
            }
        }
    } else if (typeof raw === 'string') {
        tokens.push(...raw.split(','));
    } else if (typeof raw === 'number') {
        tokens.push(String(raw));
    }

    const parsed = Array.from(
        new Set(
            tokens
                .map((v) => Number(String(v).trim()))
                .filter((v) => Number.isInteger(v) && v > 0),
        ),
    );

    return parsed.length > 0 ? parsed : undefined;
};

export const parseFetchAnalysisQuery = (
    query: Record<string, unknown>,
): FetchAnalysisParams => {
    const start = parseString(query.start);
    const end = parseString(query.end);

    const startIndex = parsePositiveInteger(query.startIndex, 0, {
        allowZero: true,
    });
    const count = parsePositiveInteger(query.count, 100);

    const eventIds = parseEventIds(query.eventIds ?? query.eventId);

    const func = parseString(query.func);
    const severity = parseString(query.severity);
    const summary = parseString(query.summary);

    return {
        start,
        end,
        startIndex,
        count,
        eventIds,
        func,
        severity,
        summary,
    };
};