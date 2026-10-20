/**
 * Сторінка «Курси валют»: таблиця з пошуком, фільтрами, сортуванням та обраним.
 */
import { getErrorMessage, getLatestRates, isAbortError } from '../api/frankfurter';
import { fillCurrencySelect, selectCurrency } from '../components/currency-select';
import { createElement, getElement } from '../components/dom';
import { createSkeleton } from '../components/skeleton';
import { clearStatus, showError, showLoading } from '../components/status';
import { initTheme } from '../components/theme';
import { loadCurrencies, METAL_CODES, type CurrencyInfo } from '../services/currencies';
import { getFavorites, toggleFavorite } from '../services/favorites';
import type { Rate } from '../types/api';
import { invertRate } from '../utils/convert';
import { debounce } from '../utils/debounce';
import { formatDate, formatNumber, getCurrencyName } from '../utils/format';
import {
  applyTableQuery,
  isRateFilter,
  isSortKey,
  type RateFilter,
  type RateRow,
  type SortDirection,
  type SortKey,
} from '../utils/rates-table';

const DEFAULT_BASE = 'UAH';
const CURRENCY_CODE_PATTERN = /^[A-Z]{3}$/;
const SVG_NS = 'http://www.w3.org/2000/svg';
const SKELETON_ROWS = 8;

// ---------- Елементи сторінки ----------
const controls = getElement('#rates-controls', HTMLFormElement);
const baseSelect = getElement('#base', HTMLSelectElement);
const searchInput = getElement('#search', HTMLInputElement);
const ratesStatus = getElement('#rates-status', HTMLDivElement);
const summary = getElement('#rates-summary', HTMLParagraphElement);
const table = getElement('#rates-table', HTMLTableElement);
const caption = getElement('#rates-caption', HTMLTableCaptionElement);
const tableHead = getElement('thead', HTMLTableSectionElement, table);
const tableBody = getElement('#rates-body', HTMLTableSectionElement);
const emptyState = getElement('#rates-empty', HTMLParagraphElement);

// ---------- Стан ----------
interface PageState {
  base: string;
  rates: Rate[];
  search: string;
  filter: RateFilter;
  sortKey: SortKey;
  sortDirection: SortDirection;
  isLoading: boolean;
}

const state: PageState = {
  base: DEFAULT_BASE,
  rates: [],
  search: '',
  filter: 'all',
  sortKey: 'code',
  sortDirection: 'ascending',
  isLoading: true,
};

/** Довідник валют: код → назви. Потрібен для українських назв і пошуку */
let currencyMap = new Map<string, CurrencyInfo>();
let ratesController: AbortController | null = null;

// =============== ПІДГОТОВКА ДАНИХ ===============

/**
 * API повертає «скільки USD коштує 1 UAH» (0.0222).
 * Людині зрозуміліше навпаки: «скільки UAH коштує 1 USD» (45.04) — тому обертаємо курс.
 */
function toRow(rate: Rate): RateRow {
  const info = currencyMap.get(rate.quote);

  return {
    code: rate.quote,
    name: info?.name ?? getCurrencyName(rate.quote),
    englishName: info?.englishName ?? '',
    value: invertRate(rate.rate),
  };
}

// =============== ВІДОБРАЖЕННЯ ===============

/** SVG створюється через createElementNS — у SVG власний простір імен */
function createStarIcon(): SVGSVGElement {
  const svg = document.createElementNS(SVG_NS, 'svg');
  svg.setAttribute('viewBox', '0 0 24 24');
  svg.setAttribute('width', '20');
  svg.setAttribute('height', '20');
  svg.setAttribute('fill', 'none');
  svg.setAttribute('aria-hidden', 'true');

  const path = document.createElementNS(SVG_NS, 'path');
  path.setAttribute(
    'd',
    'M12 3.5l2.6 5.3 5.9.9-4.3 4.1 1 5.8L12 16.9l-5.2 2.7 1-5.8-4.3-4.1 5.9-.9z',
  );
  path.setAttribute('stroke', 'currentColor');
  path.setAttribute('stroke-width', '2');
  path.setAttribute('stroke-linejoin', 'round');

  svg.append(path);
  return svg;
}

function createRow(row: RateRow, isFavorite: boolean): HTMLTableRowElement {
  const starButton = createElement(
    'button',
    {
      className: 'star-btn',
      attrs: {
        type: 'button',
        'aria-pressed': String(isFavorite),
        'aria-label': `Обране: ${row.code}, ${row.name}`,
        'data-code': row.code,
      },
    },
    [createStarIcon()],
  );

  const codeLink = createElement('a', {
    className: 'code-link',
    text: row.code,
    attrs: { href: `./currency.html?code=${row.code}` },
  });

  return createElement('tr', {}, [
    createElement('td', {}, [starButton]),
    createElement('th', { attrs: { scope: 'row' } }, [codeLink]),
    createElement('td', { text: row.name }),
    createElement('td', { className: 'num', text: `${formatNumber(row.value)} ${state.base}` }),
  ]);
}

function createSkeletonRow(): HTMLTableRowElement {
  return createElement('tr', { attrs: { 'aria-hidden': 'true' } }, [
    createElement('td', {}, [createSkeleton('1.25rem', '1.25rem')]),
    createElement('td', {}, [createSkeleton('1rem', '3rem')]),
    createElement('td', {}, [createSkeleton('1rem', '10rem')]),
    createElement('td', {}, [createSkeleton('1rem', '5rem')]),
  ]);
}

function getEmptyMessage(favoritesCount: number): string {
  if (state.filter === 'favorites' && favoritesCount === 0) {
    return 'Ви ще не додали жодної валюти в обране. Натисніть на зірочку біля валюти у списку «Усі».';
  }
  return 'Нічого не знайдено. Спробуйте змінити пошуковий запит або фільтр.';
}

/** Головна функція відображення: стан → таблиця */
function render(): void {
  if (state.isLoading) return;

  const favorites = getFavorites();
  const allRows = state.rates.filter((rate) => rate.rate > 0).map(toRow);
  const visibleRows = applyTableQuery(allRows, {
    search: state.search,
    filter: state.filter,
    sortKey: state.sortKey,
    sortDirection: state.sortDirection,
    favorites,
    metals: METAL_CODES,
  });

  tableBody.replaceChildren(...visibleRows.map((row) => createRow(row, favorites.has(row.code))));

  const date = state.rates[0]?.date;
  caption.textContent = date
    ? `Вартість 1 одиниці валюти в ${state.base} на ${formatDate(date)}`
    : `Вартість 1 одиниці валюти в ${state.base}`;

  summary.textContent = `Показано валют: ${visibleRows.length} із ${allRows.length}`;

  emptyState.textContent = getEmptyMessage(favorites.size);
  emptyState.hidden = visibleRows.length > 0;
}

/** Оновлює aria-sort у заголовках — від нього залежать і стрілки в CSS */
function updateSortHeaders(): void {
  tableHead.querySelectorAll<HTMLButtonElement>('.sort-btn').forEach((button) => {
    const isActive = button.dataset.sort === state.sortKey;
    button.closest('th')?.setAttribute('aria-sort', isActive ? state.sortDirection : 'none');
  });
}

// =============== ЗАВАНТАЖЕННЯ ДАНИХ ===============

async function loadRates(): Promise<void> {
  // Скасовуємо попередній запит, якщо користувач швидко змінив базову валюту
  ratesController?.abort();
  const controller = new AbortController();
  ratesController = controller;

  state.isLoading = true;
  emptyState.hidden = true;
  summary.textContent = '';
  table.setAttribute('aria-busy', 'true');
  tableBody.replaceChildren(...Array.from({ length: SKELETON_ROWS }, createSkeletonRow));
  showLoading(ratesStatus, 'Завантажуємо курси валют…');

  try {
    state.rates = await getLatestRates(state.base, { signal: controller.signal });
    state.isLoading = false;
    clearStatus(ratesStatus);
    render();
  } catch (error) {
    if (isAbortError(error)) return;

    state.rates = [];
    tableBody.replaceChildren();
    showError(ratesStatus, getErrorMessage(error), () => void loadRates());
  } finally {
    // Знімаємо aria-busy лише якщо це досі актуальний запит
    if (ratesController === controller) {
      table.removeAttribute('aria-busy');
    }
  }
}

async function initBaseSelect(): Promise<void> {
  try {
    const currencies = await loadCurrencies();
    currencyMap = new Map(currencies.map((currency) => [currency.code, currency]));

    if (!fillCurrencySelect(baseSelect, currencies, state.base)) {
      state.base = DEFAULT_BASE;
      selectCurrency(baseSelect, state.base);
      void loadRates();
      return;
    }

    // Довідник прийшов пізніше за курси — перемальовуємо з повними назвами для пошуку
    render();
  } catch {
    // Без списку валют таблиця все одно працює: назви беремо з Intl,
    // а базову валюту можна змінити після повторного відкриття сторінки
  }
}

// =============== ПОДІЇ ===============

function handleSortClick(event: MouseEvent): void {
  if (!(event.target instanceof Element)) return;

  const key = event.target.closest<HTMLButtonElement>('.sort-btn')?.dataset.sort;
  if (!key || !isSortKey(key)) return;

  if (state.sortKey === key) {
    // Повторний клік на ту саму колонку — змінюємо напрямок
    state.sortDirection = state.sortDirection === 'ascending' ? 'descending' : 'ascending';
  } else {
    state.sortKey = key;
    // Курс зручніше одразу бачити від найдорожчої валюти
    state.sortDirection = key === 'rate' ? 'descending' : 'ascending';
  }

  updateSortHeaders();
  render();
}

/** Делегування подій: один обробник на весь tbody замість сотні на кожну зірочку */
function handleFavoriteClick(event: MouseEvent): void {
  if (!(event.target instanceof Element)) return;

  const button = event.target.closest<HTMLButtonElement>('.star-btn');
  const code = button?.dataset.code;
  if (!button || !code) return;

  const added = toggleFavorite(code);
  button.setAttribute('aria-pressed', String(added));

  // У фільтрі «Обрані» рядок має зникнути — перемальовуємо
  if (state.filter === 'favorites') {
    render();
    // Кнопки більше немає в DOM — переносимо фокус, щоб він не «загубився»
    searchInput.focus();
  }
}

function syncUrl(): void {
  const params = new URLSearchParams({ base: state.base });
  window.history.replaceState(null, '', `?${params.toString()}`);
}

function bindEvents(): void {
  // Enter у полі пошуку не повинен перезавантажувати сторінку
  controls.addEventListener('submit', (event) => event.preventDefault());

  baseSelect.addEventListener('change', () => {
    state.base = baseSelect.value;
    syncUrl();
    void loadRates();
  });

  const debouncedSearch = debounce(() => {
    state.search = searchInput.value;
    render();
  }, 200);
  searchInput.addEventListener('input', debouncedSearch);

  // Делегування: одна подія change на форму ловить усі три радіокнопки
  controls.addEventListener('change', (event) => {
    const target = event.target;
    if (
      target instanceof HTMLInputElement &&
      target.name === 'filter' &&
      isRateFilter(target.value)
    ) {
      state.filter = target.value;
      render();
    }
  });

  tableHead.addEventListener('click', handleSortClick);
  tableBody.addEventListener('click', handleFavoriteClick);
}

function readUrlState(): void {
  const base = new URLSearchParams(window.location.search).get('base')?.toUpperCase();
  if (base && CURRENCY_CODE_PATTERN.test(base)) {
    state.base = base;
  }
}

// =============== ЗАПУСК ===============

function init(): void {
  initTheme();
  readUrlState();
  selectCurrency(baseSelect, state.base);
  updateSortHeaders();
  bindEvents();

  // Паралельно: довідник валют і курси
  void initBaseSelect();
  void loadRates();
}

init();
