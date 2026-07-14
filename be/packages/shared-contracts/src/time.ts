export function toKoreanTimeString(value?: Date | string | number | null): string {
  const date = value instanceof Date
    ? value
    : value !== undefined && value !== null
      ? new Date(value)
      : new Date();

  const kstOffsetMs = 9 * 60 * 60 * 1000;
  const kstDate = new Date(date.getTime() + kstOffsetMs);

  const pad = (n: number) => n.toString().padStart(2, '0');

  const year = kstDate.getUTCFullYear();
  const month = pad(kstDate.getUTCMonth() + 1);
  const day = pad(kstDate.getUTCDate());
  const hour = pad(kstDate.getUTCHours());
  const minute = pad(kstDate.getUTCMinutes());
  const second = pad(kstDate.getUTCSeconds());

  return `${year}-${month}-${day}T${hour}:${minute}:${second}+09:00`;
}

/**
 * 응답 객체를 재귀적으로 순회하며 모든 Date 인스턴스를 KST(+09:00) 문자열로 변환한다.
 * - Date 인스턴스만 변환하므로 문자열/숫자/jsonb(errorLogBundle 등) 페이로드는 건드리지 않는다.
 * - 백엔드 전역 인터셉터에서 사용해 모든 엔드포인트에 일괄 적용한다.
 */
export function convertDatesDeep<T>(value: T): T {
  if (value instanceof Date) {
    return toKoreanTimeString(value) as unknown as T;
  }
  if (Array.isArray(value)) {
    return value.map((item) => convertDatesDeep(item)) as unknown as T;
  }
  if (value !== null && typeof value === "object") {
    const result: Record<string, unknown> = {};
    for (const [key, item] of Object.entries(value as Record<string, unknown>)) {
      result[key] = convertDatesDeep(item);
    }
    return result as unknown as T;
  }
  return value;
}
