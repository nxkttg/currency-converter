/** Форматування для українського користувача через вбудований Intl API */

const LOCALE = 'uk-UA';

/** Скільки знаків після коми показувати: що менше число, то більше знаків */
export function getFractionDigits(value: number): number {
  const abs = Math.abs(value);
  if (abs === 0 || abs >= 1) return 2;
  if (abs >= 0.01) return 4;
  return 6;
}

/** 4487.8 → "4 487,80"; 0.02228 → "0,0223" */
export function formatNumber(value: number, fractionDigits = getFractionDigits(value)): string {
  return new Intl.NumberFormat(LOCALE, {
    minimumFractionDigits: Math.min(2, fractionDigits),
    maximumFractionDigits: fractionDigits,
  }).format(value);
}

/** 100, "USD" → "100,00 USD" */
export function formatMoney(value: number, code: string): string {
  return `${formatNumber(value)} ${code}`;
}

/** 0.0123 → "+1,23%" (знак показуємо завжди, крім нуля) */
export function formatPercent(fraction: number): string {
  return new Intl.NumberFormat(LOCALE, {
    style: 'percent',
    signDisplay: 'exceptZero',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(fraction);
}

/**
 * "2026-10-18" → "18 жовтня 2026 р."
 * timeZone: 'UTC' — інакше в країнах із від'ємним часовим поясом
 * дата «з'їхала» б на день назад.
 */
export function formatDate(isoDate: string): string {
  return new Intl.DateTimeFormat(LOCALE, {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(isoDate));
}

/** "2026-10-18" → "18 жовт." — для підписів графіка */
export function formatShortDate(isoDate: string): string {
  return new Intl.DateTimeFormat(LOCALE, {
    day: 'numeric',
    month: 'short',
    timeZone: 'UTC',
  }).format(new Date(isoDate));
}

/** Час для історії конвертацій: "18:42" */
export function formatTime(date: Date): string {
  return new Intl.DateTimeFormat(LOCALE, { hour: '2-digit', minute: '2-digit' }).format(date);
}

export function capitalize(text: string): string {
  return text.charAt(0).toLocaleUpperCase(LOCALE) + text.slice(1);
}

let currencyNames: Intl.DisplayNames | null = null;

/**
 * Українська назва валюти з бази браузера: "USD" → "Долар США".
 * Якщо браузер не знає валюту — повертає запасний варіант.
 */
export function getCurrencyName(code: string, fallback = code): string {
  try {
    currencyNames ??= new Intl.DisplayNames([LOCALE], { type: 'currency', fallback: 'none' });
    const name = currencyNames.of(code);
    return name ? capitalize(name) : fallback;
  } catch {
    // Некоректний код (наприклад, з двох літер) — Intl кидає RangeError
    return fallback;
  }
}
