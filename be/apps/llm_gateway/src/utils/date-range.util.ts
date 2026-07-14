import dayjs from "dayjs";

export function parseDateRangeKo(text: string): { start?: string; end?: string } {
  // 오늘
  if (/오늘/.test(text)) {
    const end = dayjs().format("YYYY-MM-DD");
    return { start: end, end };
  }
  // 일주일
  if (/일주일/.test(text)) {
    const end = dayjs();
    const start = end.subtract(6, "day");
    return { start: start.format("YYYY-MM-DD"), end: end.format("YYYY-MM-DD") };
  }
  // 1개월
  if (/1개월|한달|한 달/.test(text)) {
    const end = dayjs();
    const start = end.subtract(29, "day");
    return { start: start.format("YYYY-MM-DD"), end: end.format("YYYY-MM-DD") };
  }
  // 3개월
  if (/3개월|세달|세 달/.test(text)) {
    const end = dayjs();
    const start = end.subtract(89, "day");
    return { start: start.format("YYYY-MM-DD"), end: end.format("YYYY-MM-DD") };
  }
  // 6개월
  if (/6개월|여섯달|여섯 달/.test(text)) {
    const end = dayjs();
    const start = end.subtract(179, "day");
    return { start: start.format("YYYY-MM-DD"), end: end.format("YYYY-MM-DD") };
  }
  // YYYY년 MM월 DD일부터 YYYY년 MM월 DD일까지
  const m = text.match(/(\d{2,4})년\s*(\d{1,2})월\s*(\d{1,2})일?\s*부터\s*(\d{2,4})년\s*(\d{1,2})월\s*(\d{1,2})일?\s*까지/);
  if (m) {
    const start = `${m[1].padStart(4, "20")}-${m[2].padStart(2, "0")}-${m[3].padStart(2, "0")}`;
    const end = `${m[4].padStart(4, "20")}-${m[5].padStart(2, "0")}-${m[6].padStart(2, "0")}`;
    return { start, end };
  }
  return {};
}
