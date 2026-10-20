import { describe, expect, it } from 'vitest';
import {
  applyTableQuery,
  isRateFilter,
  isSortKey,
  matchesSearch,
  type RateRow,
  type TableQuery,
} from './rates-table';

const USD: RateRow = {
  code: 'USD',
  name: 'Долар США',
  englishName: 'United States Dollar',
  value: 45.04,
};
const EUR: RateRow = { code: 'EUR', name: 'Євро', englishName: 'Euro', value: 52.1 };
const XAU: RateRow = {
  code: 'XAU',
  name: 'Золото',
  englishName: 'Gold (Troy Ounce)',
  value: 170_000,
};
const PLN: RateRow = {
  code: 'PLN',
  name: 'Польський злотий',
  englishName: 'Polish Złoty',
  value: 12.2,
};

const ROWS: readonly RateRow[] = [USD, EUR, XAU, PLN];

const BASE_QUERY: TableQuery = {
  search: '',
  filter: 'all',
  sortKey: 'code',
  sortDirection: 'ascending',
  favorites: new Set(),
  metals: new Set(['XAU']),
};

const codesOf = (rows: readonly RateRow[]): string[] => rows.map((row) => row.code);

describe('matchesSearch', () => {
  it.each([
    ['usd', 'код без урахування регістру'],
    ['долар', 'українська назва'],
    ['dollar', 'англійська назва'],
    ['  США  ', 'запит з пробілами по краях'],
    ['', 'порожній запит'],
  ])('знаходить за запитом "%s" (%s)', (search) => {
    expect(matchesSearch(USD, search)).toBe(true);
  });

  it('не знаходить, якщо збігів немає', () => {
    expect(matchesSearch(USD, 'євро')).toBe(false);
  });
});

describe('applyTableQuery', () => {
  it('сортує за кодом за зростанням', () => {
    expect(codesOf(applyTableQuery(ROWS, BASE_QUERY))).toEqual(['EUR', 'PLN', 'USD', 'XAU']);
  });

  it('сортує за курсом за спаданням', () => {
    const result = applyTableQuery(ROWS, {
      ...BASE_QUERY,
      sortKey: 'rate',
      sortDirection: 'descending',
    });
    expect(codesOf(result)).toEqual(['XAU', 'EUR', 'USD', 'PLN']);
  });

  it('сортує за назвою в українському алфавітному порядку', () => {
    const result = applyTableQuery(ROWS, { ...BASE_QUERY, sortKey: 'name' });
    expect(codesOf(result)).toEqual(['USD', 'EUR', 'XAU', 'PLN']);
  });

  it('фільтр «Обрані» показує лише обрані валюти', () => {
    const result = applyTableQuery(ROWS, {
      ...BASE_QUERY,
      filter: 'favorites',
      favorites: new Set(['USD', 'PLN']),
    });
    expect(codesOf(result)).toEqual(['PLN', 'USD']);
  });

  it('фільтр «Метали» показує лише метали', () => {
    const result = applyTableQuery(ROWS, { ...BASE_QUERY, filter: 'metals' });
    expect(codesOf(result)).toEqual(['XAU']);
  });

  it('поєднує пошук і фільтр', () => {
    const result = applyTableQuery(ROWS, {
      ...BASE_QUERY,
      search: 'злотий',
      filter: 'favorites',
      favorites: new Set(['USD', 'PLN']),
    });
    expect(codesOf(result)).toEqual(['PLN']);
  });

  it('не змінює вхідний масив', () => {
    const original = [...ROWS];
    applyTableQuery(ROWS, { ...BASE_QUERY, sortKey: 'rate' });
    expect(ROWS).toEqual(original);
  });
});

describe('type guards', () => {
  it('isSortKey розпізнає допустимі ключі', () => {
    expect(isSortKey('rate')).toBe(true);
    expect(isSortKey('price')).toBe(false);
  });

  it('isRateFilter розпізнає допустимі фільтри', () => {
    expect(isRateFilter('metals')).toBe(true);
    expect(isRateFilter('crypto')).toBe(false);
  });
});
