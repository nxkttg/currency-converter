/**
 * Сторінка деталей валюти: інформація, інтерактивний графік курсу, статистика.
 * Адреса: currency.html?code=USD
 */
import { getErrorMessage, getTimeSeries, isAbortError } from '../api/frankfurter';
import { createLineChart } from '../components/chart';
import { createElement, getElement } from '../components/dom';
import { clearStatus, showError, showLoading } from '../components/status';
import { initTheme } from '../components/theme';
import { findCurrency, loadCurrencies, type CurrencyInfo } from '../services/currencies';
import { isFavorite, toggleFavorite } from '../services/favorites';
import type { ChartPoint } from '../utils/chart';
import { calculateStats, type RateStats } from '../utils/convert';
import { subtractDays, toIsoDate } from '../utils/date';
import {
  formatDate,
  formatNumber,
  formatPercent,
  formatShortDate,
  getCurrencyName,
  getTrendClass,
} from '../utils/format';

const CURRENCY_CODE_PATTERN = /^[A-Z]{3}$/;
const PERIODS: readonly number[] = [7, 30, 90, 365];
const DEFAULT_PERIOD = 30;

// ---------- Елементи сторінки ----------
const pageStatus = getElement('#page-status', HTMLDivElement);
const crumbCurrent = getElement('#crumb-current', HTMLSpanElement);
const article = getElement('#currency-article', HTMLElement);
const symbolElement = getElement('#currency-symbol', HTMLSpanElement);
const titleElement = getElement('#currency-title', HTMLHeadingElement);
const subtitleElement = getElement('#currency-subtitle', HTMLParagraphElement);
const favoriteButton = getElement('#fav-btn', HTMLButtonElement);
const factCode = getElement('#fact-code', HTMLElement);
const factNumeric = getElement('#fact-numeric', HTMLElement);
const factSymbol = getElement('#fact-symbol', HTMLElement);
const factSince = getElement('#fact-since', HTMLElement);
const chartSection = getElement('.chart-section', HTMLElement);
const chartTitle = getElement('#chart-title', HTMLHeadingElement);
const periodGroup = getElement('.segmented', HTMLDivElement, chartSection);
const chartContainer = getElement('#chart', HTMLDivElement);
const chartCaption = getElement('#chart-caption', HTMLElement);
const statMin = getElement('#stat-min', HTMLElement);
const statMax = getElement('#stat-max', HTMLElement);
const statAvg = getElement('#stat-avg', HTMLElement);
const statChange = getElement('#stat-change', HTMLElement);
const convertLink = getElement('#convert-link', HTMLAnchorElement);

// ---------- Стан ----------
const state = {
  code: '',
  /** Валюта, у якій показуємо курс: гривня, а для самої гривні — долар */
  quote: 'UAH',
  days: DEFAULT_PERIOD,
};

let seriesController: AbortController | null = null;

const chart = createLineChart(chartContainer, {
  getLabel: () =>
    `Графік курсу ${state.code} до ${state.quote}. ` +
    'Стрілки ліворуч і праворуч переміщують між днями, Home і End — до першого та останнього дня.',
  formatValue: (value) => formatNumber(value),
  formatAxisDate: (date) => formatShortDate(date),
  formatTooltip: (point) =>
    `${formatDate(point.date)}: ${formatNumber(point.value)} ${state.quote}`,
});

// =============== ІНФОРМАЦІЯ ПРО ВАЛЮТУ ===============

/** Мінімальні дані, якщо довідник валют недоступний — назву беремо з Intl */
function createFallbackInfo(code: string): CurrencyInfo {
  return {
    code,
    name: getCurrencyName(code),
    englishName: '',
    symbol: null,
    numericCode: null,
    since: '',
  };
}

function renderInfo(info: CurrencyInfo): void {
  const title = `${info.name} (${info.code})`;

  // SEO: заголовок вкладки та опис змінюються під конкретну валюту
  document.title = `${info.code} — ${info.name} — Валютник`;
  document
    .querySelector('meta[name="description"]')
    ?.setAttribute(
      'content',
      `${info.name} (${info.code}): графік курсу до ${state.quote}, мінімум, максимум і зміна за період.`,
    );

  crumbCurrent.textContent = info.code;
  titleElement.textContent = title;
  subtitleElement.textContent = info.englishName;
  symbolElement.textContent = info.symbol ?? '';

  factCode.textContent = info.code;
  factNumeric.textContent = info.numericCode ?? '—';
  factSymbol.textContent = info.symbol ?? '—';
  factSince.textContent = info.since ? formatDate(info.since) : '—';

  chartTitle.textContent = `Динаміка курсу ${info.code} до ${state.quote}`;

  const params = new URLSearchParams({ from: info.code, to: state.quote });
  convertLink.href = `./index.html?${params.toString()}`;
  convertLink.textContent = `Конвертувати ${info.code}`;
}

function showNotFound(message: string): void {
  seriesController?.abort();
  article.hidden = true;
  document.title = 'Валюту не знайдено — Валютник';
  crumbCurrent.textContent = 'Не знайдено';

  showError(pageStatus, message);
  pageStatus.append(
    createElement('a', {
      className: 'btn btn--ghost',
      text: 'До таблиці курсів',
      attrs: { href: './rates.html' },
    }),
  );
}

// =============== ОБРАНЕ ===============

function updateFavoriteButton(): void {
  const pressed = isFavorite(state.code);

  favoriteButton.setAttribute('aria-pressed', String(pressed));
  // Текст кнопки не змінюємо — стан передає aria-pressed. Зірочка суто декоративна
  favoriteButton.replaceChildren(
    createElement('span', { text: pressed ? '★' : '☆', attrs: { 'aria-hidden': 'true' } }),
    ' Обране',
  );
}

// =============== ГРАФІК І СТАТИСТИКА ===============

function renderStats(stats: RateStats | null): void {
  if (!stats) {
    for (const element of [statMin, statMax, statAvg, statChange]) {
      element.textContent = '—';
    }
    statChange.className = '';
    return;
  }

  statMin.textContent = `${formatNumber(stats.min)} ${state.quote}`;
  statMax.textContent = `${formatNumber(stats.max)} ${state.quote}`;
  statAvg.textContent = `${formatNumber(stats.average)} ${state.quote}`;
  statChange.textContent = formatPercent(stats.change);
  statChange.className = getTrendClass(stats.change);
}

/** Текстовий підсумок графіка — альтернатива для тих, хто не бачить зображення */
function renderCaption(points: readonly ChartPoint[], stats: RateStats | null): void {
  const first = points[0];
  const last = points.at(-1);

  if (!first || !last || !stats) {
    chartCaption.textContent = '';
    return;
  }

  chartCaption.textContent =
    `Курс ${state.code} до ${state.quote} з ${formatDate(first.date)} по ${formatDate(last.date)}: ` +
    `від ${formatNumber(stats.min)} до ${formatNumber(stats.max)} ${state.quote}, ` +
    `зміна за період ${formatPercent(stats.change)}.`;
}

function updatePeriodButtons(): void {
  periodGroup.querySelectorAll<HTMLButtonElement>('[data-period]').forEach((button) => {
    button.setAttribute('aria-pressed', String(Number(button.dataset.period) === state.days));
  });
}

async function loadSeries(): Promise<void> {
  // Користувач швидко перемикає періоди — скасовуємо застарілий запит
  seriesController?.abort();
  const controller = new AbortController();
  seriesController = controller;

  chartSection.setAttribute('aria-busy', 'true');
  chart.setLoading();
  showLoading(pageStatus, 'Завантажуємо історію курсу…');

  try {
    const from = toIsoDate(subtractDays(new Date(), state.days));
    const series = await getTimeSeries(state.code, state.quote, from, undefined, {
      signal: controller.signal,
    });

    const points: ChartPoint[] = [...series]
      .sort((a, b) => a.date.localeCompare(b.date))
      .map((rate) => ({ date: rate.date, value: rate.rate }));
    const stats = calculateStats(points.map((point) => point.value));

    clearStatus(pageStatus);
    chart.update(points);
    renderStats(stats);
    renderCaption(points, stats);
  } catch (error) {
    if (isAbortError(error)) return;

    chart.update([]);
    renderStats(null);
    renderCaption([], null);
    showError(pageStatus, getErrorMessage(error), () => void loadSeries());
  } finally {
    if (seriesController === controller) {
      chartSection.removeAttribute('aria-busy');
    }
  }
}

// =============== ПОДІЇ ===============

function bindEvents(): void {
  // Делегування: один обробник на групу з чотирьох кнопок періоду
  periodGroup.addEventListener('click', (event) => {
    if (!(event.target instanceof Element)) return;

    const button = event.target.closest<HTMLButtonElement>('[data-period]');
    const days = Number(button?.dataset.period);

    if (!PERIODS.includes(days) || days === state.days) return;

    state.days = days;
    updatePeriodButtons();
    void loadSeries();
  });

  favoriteButton.addEventListener('click', () => {
    toggleFavorite(state.code);
    updateFavoriteButton();
  });
}

function readCode(): string | null {
  const code = new URLSearchParams(window.location.search).get('code')?.toUpperCase();
  return code && CURRENCY_CODE_PATTERN.test(code) ? code : null;
}

// =============== ЗАПУСК ===============

async function init(): Promise<void> {
  initTheme();

  const code = readCode();
  if (!code) {
    showNotFound('Валюту не вказано. Оберіть її в таблиці курсів.');
    return;
  }

  state.code = code;
  state.quote = code === 'UAH' ? 'USD' : 'UAH';

  renderInfo(createFallbackInfo(code));
  updateFavoriteButton();
  updatePeriodButtons();
  bindEvents();

  // Графік завантажуємо одразу, не чекаючи довідника валют — так швидше
  void loadSeries();

  try {
    const currencies = await loadCurrencies();
    const info = findCurrency(currencies, code);

    if (!info) {
      showNotFound(`Валюту «${code}» не знайдено.`);
      return;
    }

    renderInfo(info);
  } catch {
    // Довідник недоступний — лишаємо назву з Intl, графік працює незалежно
  }
}

void init();
