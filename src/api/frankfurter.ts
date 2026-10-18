/**
 * Клієнт Frankfurter API v2.
 * Єдине місце в проєкті, яке «знає» про сервер:
 * якщо API зміниться — правимо тільки цей файл.
 */
import type { Currency, Rate } from '../types/api';
import { isApiErrorBody, isCurrencyArray, isRate, isRateArray } from './validators';

export const API_BASE_URL = 'https://api.frankfurter.dev/v2';
const DEFAULT_TIMEOUT_MS = 10_000;

/** Тип помилки — union з рядкових літералів */
export type ApiErrorKind = 'network' | 'timeout' | 'aborted' | 'http' | 'invalid-data';

/** Власний клас помилки: зберігає тип, HTTP-статус і деталі від сервера */
export class ApiError extends Error {
  readonly kind: ApiErrorKind;
  readonly status: number | null;
  readonly details: string | null;

  constructor(
    message: string,
    kind: ApiErrorKind,
    status: number | null = null,
    details: string | null = null,
  ) {
    super(message);
    this.name = 'ApiError';
    this.kind = kind;
    this.status = status;
    this.details = details;
  }
}

export interface RequestOptions {
  /** Сигнал для скасування запиту (наприклад, коли користувач змінив валюту) */
  signal?: AbortSignal;
  /** Максимальний час очікування відповіді, мс */
  timeoutMs?: number;
}

type QueryParams = Record<string, string | undefined>;
type Guard<T> = (value: unknown) => value is T;

/** Збирає повну адресу запиту з параметрами. Порожні параметри пропускає */
export function buildUrl(path: string, params: QueryParams = {}): string {
  const url = new URL(API_BASE_URL + path);

  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== '') {
      url.searchParams.set(key, value);
    }
  }

  return url.toString();
}

/** Зрозуміле повідомлення для користувача залежно від HTTP-статусу */
function getHttpErrorMessage(status: number): string {
  if (status === 404) return 'Дані для цієї валюти не знайдено.';
  if (status === 400 || status === 422) return 'Некоректний запит. Перевірте обрані валюти.';
  if (status === 429) return 'Забагато запитів. Зачекайте хвилину та спробуйте ще раз.';
  if (status >= 500) return 'Сервер курсів тимчасово недоступний. Спробуйте пізніше.';
  return `Помилка сервера (код ${status}).`;
}

function getErrorName(error: unknown): string {
  if (typeof error === 'object' && error !== null && 'name' in error) {
    return String(error.name);
  }
  return '';
}

/** Намагається прочитати пояснення помилки з тіла відповіді сервера */
async function readErrorDetails(response: Response): Promise<string | null> {
  try {
    const body: unknown = await response.json();
    return isApiErrorBody(body) ? body.message : null;
  } catch {
    return null;
  }
}

function invalidDataError(): ApiError {
  return new ApiError('Сервер повернув дані в неочікуваному форматі.', 'invalid-data');
}

/**
 * Базова функція запиту.
 * Generic <T>: тип результату визначається функцією-перевіркою guard.
 */
async function request<T>(
  path: string,
  params: QueryParams,
  guard: Guard<T>,
  options: RequestOptions = {},
): Promise<T> {
  // Тайм-аут + (за потреби) зовнішній сигнал скасування, об'єднані в один
  const timeoutSignal = AbortSignal.timeout(options.timeoutMs ?? DEFAULT_TIMEOUT_MS);
  const signal = options.signal ? AbortSignal.any([options.signal, timeoutSignal]) : timeoutSignal;

  let response: Response;

  try {
    response = await fetch(buildUrl(path, params), {
      signal,
      headers: { Accept: 'application/json' },
    });
  } catch (error) {
    // fetch відхиляє проміс ЛИШЕ при мережевих проблемах або скасуванні
    const name = getErrorName(error);

    if (name === 'TimeoutError') {
      throw new ApiError(
        'Сервер курсів не відповідає. Перевірте з’єднання та спробуйте ще раз.',
        'timeout',
      );
    }
    if (name === 'AbortError') {
      throw new ApiError('Запит скасовано.', 'aborted');
    }
    throw new ApiError(
      'Не вдалося з’єднатися з сервером. Перевірте підключення до інтернету.',
      'network',
    );
  }

  // HTTP-помилки (404, 500…) fetch НЕ вважає винятками — перевіряємо вручну
  if (!response.ok) {
    const details = await readErrorDetails(response);
    throw new ApiError(getHttpErrorMessage(response.status), 'http', response.status, details);
  }

  let data: unknown;
  try {
    data = await response.json();
  } catch {
    throw invalidDataError();
  }

  if (!guard(data)) {
    throw invalidDataError();
  }

  return data;
}

// ---------- Публічні функції ----------

/** Список усіх доступних валют */
export function getCurrencies(options?: RequestOptions): Promise<Currency[]> {
  return request('/currencies', {}, isCurrencyArray, options);
}

/** Актуальні курси всіх валют відносно базової */
export function getLatestRates(base: string, options?: RequestOptions): Promise<Rate[]> {
  return request('/rates', { base }, isRateArray, options);
}

/** Курс однієї валютної пари */
export function getRate(base: string, quote: string, options?: RequestOptions): Promise<Rate> {
  const path = `/rate/${encodeURIComponent(base)}/${encodeURIComponent(quote)}`;
  return request(path, {}, isRate, options);
}

/** Історія курсу пари за період (для графіка) */
export function getTimeSeries(
  base: string,
  quote: string,
  from: string,
  to?: string,
  options?: RequestOptions,
): Promise<Rate[]> {
  return request('/rates', { base, quotes: quote, from, to }, isRateArray, options);
}

// ---------- Допоміжні функції для інтерфейсу ----------

/** Текст помилки, який можна показати користувачу */
export function getErrorMessage(error: unknown): string {
  return error instanceof ApiError
    ? error.message
    : 'Сталася неочікувана помилка. Спробуйте ще раз.';
}

/** Чи це скасований запит (такі помилки показувати не треба) */
export function isAbortError(error: unknown): boolean {
  return error instanceof ApiError && error.kind === 'aborted';
}
