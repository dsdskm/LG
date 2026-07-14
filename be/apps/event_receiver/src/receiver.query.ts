export type FetchEventsParams = {
    start?: string;
    end?: string;
    startIndex: number;
    count: number;
    status?: string;
    eventIds?: number[];
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

const parseEventIds = (value: unknown): number[] | undefined => {
    const chunks = Array.isArray(value)
        ? value.flatMap((item) =>
            typeof item === 'string' ? item.split(',') : [],
        )
        : typeof value === 'string'
            ? value.split(',')
            : [];

    const eventIds = Array.from(
        new Set(
            chunks
                .map((item) => Number(String(item).trim()))
                .filter((item) => Number.isInteger(item) && item > 0),
        ),
    );

    return eventIds.length > 0 ? eventIds : undefined;
};

export const parseFetchEventsQuery = (
    query: Record<string, unknown>,
): FetchEventsParams => {
    const start = parseString(query.start);
    const end = parseString(query.end);
    const status = parseString(query.status);

    const startIndex = parsePositiveInteger(query.startIndex, 0, {
        allowZero: true,
    });
    const count = parsePositiveInteger(query.count, 50);

    const eventIds = parseEventIds(query.eventIds);

    return {
        start,
        end,
        startIndex,
        count,
        status,
        eventIds,
    };
};