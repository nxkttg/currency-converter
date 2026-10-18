/** Чисті функції для обчислень: не чіпають DOM і мережу, тому легко тестуються */

/**
 * Discriminated union (розмічене об'єднання):
 * за полем ok TypeScript знає, чи є value, чи error.
 */
export type AmountValidation = { ok: true; value: number } | { ok: false; error: string };

export const MAX_AMOUNT = 1_000_000_000_000;

/**
 * Перетворює введений текст на число.
 * Приймає кому як десятковий роздільник і пробіли між розрядами: "1 000,50".
 */
export function parseAmount(input: string): AmountValidation {
  const normalized = input.trim().replace(/\s/g, '').replace(',', '.');

  if (normalized === '') {
    return { ok: false, error: 'Введіть суму.' };
  }
  if (normalized.startsWith('-')) {
    return { ok: false, error: 'Сума не може бути від’ємною.' };
  }
  if (!/^(\d+\.?\d*|\.\d+)$/.test(normalized)) {
    return { ok: false, error: 'Введіть число, наприклад 100 або 12,50.' };
  }

  const value = Number(normalized);

  if (value === 0) {
    return { ok: false, error: 'Сума має бути більшою за нуль.' };
  }
  if (value > MAX_AMOUNT) {
    return { ok: false, error: 'Сума занадто велика.' };
  }

  return { ok: true, value };
}

/** Конвертація: сума × курс */
export function convert(amount: number, rate: number): number {
  return amount * rate;
}

/** Обернений курс: якщо 1 UAH = 0.0223 USD, то 1 USD = 44.88 UAH */
export function invertRate(rate: number): number {
  if (rate === 0) {
    throw new RangeError('Курс не може дорівнювати нулю.');
  }
  return 1 / rate;
}

/** Відносна зміна: 0.05 означає +5% */
export function calculateChange(first: number, last: number): number {
  if (first === 0) return 0;
  return (last - first) / first;
}

export interface RateStats {
  min: number;
  max: number;
  average: number;
  change: number;
}

/** Статистика курсу за період. Для порожнього масиву повертає null */
export function calculateStats(values: readonly number[]): RateStats | null {
  const first = values[0];
  const last = values.at(-1);

  // Завдяки noUncheckedIndexedAccess TypeScript змушує обробити порожній масив
  if (first === undefined || last === undefined) {
    return null;
  }

  const sum = values.reduce((total, value) => total + value, 0);

  return {
    min: Math.min(...values),
    max: Math.max(...values),
    average: sum / values.length,
    change: calculateChange(first, last),
  };
}
