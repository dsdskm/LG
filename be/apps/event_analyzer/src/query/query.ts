export type QueryLogsParams = {
    start?: string;
    end?: string;
    status?: string;
    severity?: string;
    func?: string;
    summary?: string;
    startIndex: number;
    count: number;
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

export const parseQueryLogsParams = (
    query: Record<string, unknown>,
): QueryLogsParams => {
    const start = parseString(query.start);
    const end = parseString(query.end);
    const status = parseString(query.status);
    const severity = parseString(query.severity);
    const func = parseString(query.func);
    const summary = parseString(query.summary);

    const startIndex = parsePositiveInteger(query.startIndex, 0, {
        allowZero: true,
    });
    const count = parsePositiveInteger(query.count, 50);

    return {
        start,
        end,
        status,
        severity,
        func,
        summary,
        startIndex,
        count,
    };
};