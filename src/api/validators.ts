/**
 * Type guards — перевірка даних від сервера ПІД ЧАС ВИКОНАННЯ.
 * TypeScript перевіряє типи лише під час розробки, тому дані ззовні
 * треба перевіряти вручну, а не довіряти серверу наосліп.
 */
import type { ApiErrorBody, Currency, Rate } from '../types/api';

/** Звичайний об'єкт: не null і не масив */
export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isStringOrNull(value: unknown): value is string | null {
  return typeof value === 'string' || value === null;
}

/**
 * Узагальнена (generic) функція: з перевірки одного елемента
 * створює перевірку масиву таких елементів.
 */
function isArrayOf<T>(guard: (item: unknown) => item is T) {
  return (value: unknown): value is T[] => Array.isArray(value) && value.every(guard);
}

export function isCurrency(value: unknown): value is Currency {
  return (
    isRecord(value) &&
    typeof value.iso_code === 'string' &&
    isStringOrNull(value.iso_numeric) &&
    typeof value.name === 'string' &&
    isStringOrNull(value.symbol) &&
    typeof value.start_date === 'string' &&
    typeof value.end_date === 'string'
  );
}

export function isRate(value: unknown): value is Rate {
  return (
    isRecord(value) &&
    typeof value.date === 'string' &&
    typeof value.base === 'string' &&
    typeof value.quote === 'string' &&
    typeof value.rate === 'number' &&
    Number.isFinite(value.rate)
  );
}

export function isApiErrorBody(value: unknown): value is ApiErrorBody {
  return isRecord(value) && typeof value.status === 'number' && typeof value.message === 'string';
}

export const isCurrencyArray = isArrayOf(isCurrency);
export const isRateArray = isArrayOf(isRate);
