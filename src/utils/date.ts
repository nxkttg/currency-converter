/** Date → "2026-10-18" (формат, який приймає API) */
export function toIsoDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

/** Дата, на days днів раніше за вказану */
export function subtractDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setUTCDate(result.getUTCDate() - days);
  return result;
}
