/**
 * Завантаження списку валют.
 * Список змінюється рідко, тому кешуємо його в localStorage на 12 годин:
 * менше запитів до сервера, швидше відкриваються сторінки.
 */
import { getCurrencies, type RequestOptions } from '../api/frankfurter';
import { isCurrencyArray, isRecord } from '../api/validators';
import type { Currency } from '../types/api';
import { getCurrencyName } from '../utils/format';
import { readStorage, writeStorage } from '../utils/storage';

/** Дані валюти, підготовлені для інтерфейсу */
export interface CurrencyInfo {
  code: string;
  /** Українська назва */
  name: string;
  englishName: string;
  symbol: string | null;
  numericCode: string | null;
  since: string;
}

/** Дорогоцінні метали (золото, срібло, платина, паладій) */
export const METAL_CODES: ReadonlySet<string> = new Set(['XAU', 'XAG', 'XPT', 'XPD']);

const CACHE_KEY = 'valiutnyk:currencies';
const CACHE_TTL_MS = 12 * 60 * 60 * 1000;

interface CurrencyCache {
  savedAt: number;
  items: Currency[];
}

function isCurrencyCache(value: unknown): value is CurrencyCache | null {
  return (
    value === null ||
    (isRecord(value) && typeof value.savedAt === 'number' && isCurrencyArray(value.items))
  );
}

export function toCurrencyInfo(currency: Currency): CurrencyInfo {
  return {
    code: currency.iso_code,
    name: getCurrencyName(currency.iso_code, currency.name),
    englishName: currency.name,
    // || замість ?? — щоб порожній рядок "" теж вважався відсутнім значенням
    symbol: currency.symbol || null,
    numericCode: currency.iso_numeric || null,
    since: currency.start_date,
  };
}

function prepare(items: readonly Currency[]): CurrencyInfo[] {
  return items.map(toCurrencyInfo).sort((a, b) => a.code.localeCompare(b.code));
}

export async function loadCurrencies(options?: RequestOptions): Promise<CurrencyInfo[]> {
  const cached = readStorage(CACHE_KEY, isCurrencyCache, null);

  if (cached && Date.now() - cached.savedAt < CACHE_TTL_MS) {
    return prepare(cached.items);
  }

  try {
    const items = await getCurrencies(options);
    writeStorage(CACHE_KEY, { savedAt: Date.now(), items } satisfies CurrencyCache);
    return prepare(items);
  } catch (error) {
    // Немає мережі? Краще показати застарілий список, ніж нічого
    if (cached) return prepare(cached.items);
    throw error;
  }
}

export function findCurrency(
  currencies: readonly CurrencyInfo[],
  code: string,
): CurrencyInfo | undefined {
  return currencies.find((currency) => currency.code === code);
}
