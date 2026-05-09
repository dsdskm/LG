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
