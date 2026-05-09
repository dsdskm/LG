export const STATUS_LABEL_MAP: Record<string, string> = {
  received: '로그 획득',
  prepared: '분석 준비 완료',
  analyzing: '분석중',
  analyzed: '분석 완료',
  completed: '수행 완료',
  failed: '오류 발생',
  unknown: '알 수 없음',
};

export const STATUS_COLOR_MAP: Record<string, string> = {
  received: 'bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-200',
  prepared: 'bg-sky-100 text-sky-700 dark:bg-sky-900/20 dark:text-sky-200',
  analyzing:
    'bg-amber-100 text-amber-700 dark:bg-amber-900/20 dark:text-amber-200',
  analyzed:
    'bg-amber-100 text-amber-700 dark:bg-amber-900/20 dark:text-amber-200',
  completed:
    'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/20 dark:text-emerald-200',
  failed: 'bg-rose-100 text-rose-700 dark:bg-rose-900/20 dark:text-rose-200',
  unknown: 'bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-200',
};
