/**
 * Фільтрація, пошук і сортування таблиці курсів.
 * Чисті функції: не чіпають DOM, тому легко тестуються.
 */

/** Рядок таблиці */
export interface RateRow {
  code: string;
  /** Українська назва */
  name: string;
  /** Англійська назва — для пошуку латиницею */
  englishName: string;
  /** Скільки коштує 1 одиниця валюти в базовій валюті */
  value: number;
}

export type SortKey = 'code' | 'name' | 'rate';
/** Значення збігаються з атрибутом aria-sort — використовуємо їх напряму */
export type SortDirection = 'ascending' | 'descending';
export type RateFilter = 'all' | 'favorites' | 'metals';

export interface TableQuery {
  search: string;
  filter: RateFilter;
  sortKey: SortKey;
  sortDirection: SortDirection;
  favorites: ReadonlySet<string>;
  metals: ReadonlySet<string>;
}

const SORT_KEYS: readonly SortKey[] = ['code', 'name', 'rate'];
const FILTERS: readonly RateFilter[] = ['all', 'favorites', 'metals'];

/** Type guard: рядок з HTML (data-sort) — це допустимий ключ сортування? */
export function isSortKey(value: string): value is SortKey {
  return SORT_KEYS.some((key) => key === value);
}

export function isRateFilter(value: string): value is RateFilter {
  return FILTERS.some((filter) => filter === value);
}

/** Пошук без урахування регістру: за кодом, українською та англійською назвою */
export function matchesSearch(row: RateRow, search: string): boolean {
  const query = search.trim().toLocaleLowerCase('uk-UA');
  if (query === '') return true;

  return [row.code, row.name, row.englishName].some((text) =>
    text.toLocaleLowerCase('uk-UA').includes(query),
  );
}

function matchesFilter(row: RateRow, query: TableQuery): boolean {
  switch (query.filter) {
    case 'all':
      return true;
    case 'favorites':
      return query.favorites.has(row.code);
    case 'metals':
      return query.metals.has(row.code);
  }
}

function compareRows(a: RateRow, b: RateRow, key: SortKey): number {
  switch (key) {
    case 'code':
      return a.code.localeCompare(b.code);
    case 'name':
      // 'uk' — правильний український алфавітний порядок (Є після Е, І після И)
      return a.name.localeCompare(b.name, 'uk');
    case 'rate':
      return a.value - b.value;
  }
}

/** Повертає НОВИЙ масив: відфільтрований і відсортований. Вхідний масив не змінюється */
export function applyTableQuery(rows: readonly RateRow[], query: TableQuery): RateRow[] {
  const direction = query.sortDirection === 'ascending' ? 1 : -1;

  return rows
    .filter((row) => matchesFilter(row, query) && matchesSearch(row, query.search))
    .sort((a, b) => compareRows(a, b, query.sortKey) * direction);
}
