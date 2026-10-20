/**
 * Головна сторінка: конвертер валют, популярні курси, історія.
 * Стилі підключені через <link> у index.html.
 */
import { getErrorMessage, getRate, getTimeSeries, isAbortError } from '../api/frankfurter';
import { fillCurrencySelect, selectCurrency } from '../components/currency-select';
import { createElement, getElement } from '../components/dom';
import { createSkeleton } from '../components/skeleton';
import { clearStatus, showError, showLoading } from '../components/status';
import { initTheme } from '../components/theme';
import { loadCurrencies } from '../services/currencies';
import { addHistoryEntry, clearHistory, getHistory, type HistoryEntry } from '../services/history';
import type { Rate } from '../types/api';
import { calculateStats, convert, parseAmount } from '../utils/convert';
import { subtractDays, toIsoDate } from '../utils/date';
import { debounce } from '../utils/debounce';
import {
  formatDate,
  formatMoney,
  formatNumber,
  formatPercent,
  formatTime,
  getCurrencyName,
} from '../utils/format';

const DEFAULT_FROM = 'USD';
const DEFAULT_TO = 'UAH';
const POPULAR_CODES = ['USD', 'EUR', 'PLN', 'GBP'];
const RATE_CACHE_TTL_MS = 10 * 60 * 1000;
const CURRENCY_CODE_PATTERN = /^[A-Z]{3}$/;

// ---------- Елементи сторінки ----------
const form = getElement('#converter-form', HTMLFormElement);
const amountInput = getElement('#amount', HTMLInputElement);
const amountError = getElement('#amount-error', HTMLParagraphElement);
const fromSelect = getElement('#from', HTMLSelectElement);
const toSelect = getElement('#to', HTMLSelectElement);
const swapButton = getElement('#swap-btn', HTMLButtonElement);
const resultOutput = getElement('#result', HTMLOutputElement);
const rateInfo = getElement('#rate-info', HTMLParagraphElement);
const converterStatus = getElement('#converter-status', HTMLDivElement);
const popularList = getElement('#popular-list', HTMLUListElement);
const historyTitle = getElement('#history-title', HTMLHeadingElement);
const historyList = getElement('#history-list', HTMLOListElement);
const historyEmpty = getElement('#history-empty', HTMLParagraphElement);
const historyClear = getElement('#history-clear', HTMLButtonElement);

// ---------- Стан ----------
const state = { from: DEFAULT_FROM, to: DEFAULT_TO };

/** Кеш курсів: якщо змінилась лише сума — запит до сервера не потрібен */
const rateCache = new Map<string, { rate: Rate; savedAt: number }>();

/** Контролер поточного запиту — щоб скасувати його, якщо прийде новий */
let conversionController: AbortController | null = null;

// =============== КОНВЕРТЕР ===============

function setAmountError(message: string | null): void {
  if (message === null) {
    amountInput.removeAttribute('aria-invalid');
    amountError.textContent = '';
    amountError.hidden = true;
  } else {
    amountInput.setAttribute('aria-invalid', 'true');
    amountError.textContent = message;
    amountError.hidden = false;
  }
}

function clearResult(): void {
  resultOutput.textContent = '';
  rateInfo.textContent = '';
}

function getCachedRate(from: string, to: string): Rate | null {
  const cached = rateCache.get(`${from}-${to}`);
  return cached && Date.now() - cached.savedAt < RATE_CACHE_TTL_MS ? cached.rate : null;
}

/** Зберігаємо стан у адресі сторінки — посиланням можна поділитися */
function syncUrl(amount: number): void {
  const params = new URLSearchParams({ from: state.from, to: state.to, amount: String(amount) });
  window.history.replaceState(null, '', `?${params.toString()}`);
}

function renderResult(amount: number, rate: Rate): void {
  const result = convert(amount, rate.rate);

  resultOutput.textContent = formatMoney(result, rate.quote);
  rateInfo.textContent = `1 ${rate.base} = ${formatNumber(rate.rate)} ${rate.quote} · курс на ${formatDate(rate.date)}`;

  addHistoryEntry({
    amount,
    from: rate.base,
    to: rate.quote,
    result,
    rate: rate.rate,
    timestamp: Date.now(),
  });
  renderHistory();
}

async function updateConversion(): Promise<void> {
  const parsed = parseAmount(amountInput.value);

  if (!parsed.ok) {
    setAmountError(parsed.error);
    clearResult();
    return;
  }

  setAmountError(null);
  syncUrl(parsed.value);

  // Скасовуємо попередній запит: його відповідь уже неактуальна
  conversionController?.abort();

  const { from, to } = state;

  if (from === to) {
    clearStatus(converterStatus);
    resultOutput.textContent = formatMoney(parsed.value, to);
    rateInfo.textContent = 'Обрано однакові валюти.';
    return;
  }

  const cached = getCachedRate(from, to);
  if (cached) {
    clearStatus(converterStatus);
    renderResult(parsed.value, cached);
    return;
  }

  const controller = new AbortController();
  conversionController = controller;
  showLoading(converterStatus, 'Отримуємо актуальний курс…');

  try {
    const rate = await getRate(from, to, { signal: controller.signal });
    rateCache.set(`${from}-${to}`, { rate, savedAt: Date.now() });
    clearStatus(converterStatus);
    renderResult(parsed.value, rate);
  } catch (error) {
    if (isAbortError(error)) return;

    clearResult();
    showError(converterStatus, getErrorMessage(error), () => void updateConversion());
  }
}

function bindConverterEvents(): void {
  // Під час набору тексту чекаємо паузу 350 мс, а не рахуємо на кожну літеру
  const debouncedUpdate = debounce(() => void updateConversion(), 350);

  amountInput.addEventListener('input', debouncedUpdate);

  fromSelect.addEventListener('change', () => {
    state.from = fromSelect.value;
    void updateConversion();
  });

  toSelect.addEventListener('change', () => {
    state.to = toSelect.value;
    void updateConversion();
  });

  swapButton.addEventListener('click', () => {
    // Деструктуризація: обмін значень без тимчасової змінної
    [state.from, state.to] = [state.to, state.from];
    selectCurrency(fromSelect, state.from);
    selectCurrency(toSelect, state.to);
    void updateConversion();
  });

  form.addEventListener('submit', (event) => {
    event.preventDefault(); // не перезавантажувати сторінку
    debouncedUpdate.cancel();
    void updateConversion();
  });
}

/** Читає початковий стан з адреси: ?from=EUR&to=UAH&amount=50 */
function readUrlState(): void {
  const params = new URLSearchParams(window.location.search);
  const from = params.get('from')?.toUpperCase();
  const to = params.get('to')?.toUpperCase();
  const amount = params.get('amount');

  if (from && CURRENCY_CODE_PATTERN.test(from)) state.from = from;
  if (to && CURRENCY_CODE_PATTERN.test(to)) state.to = to;
  if (amount) amountInput.value = amount;

  // Посилання «Конвертувати UAH» не повинно давати пару UAH → UAH
  if (state.from === state.to) {
    state.to = state.from === DEFAULT_TO ? DEFAULT_FROM : DEFAULT_TO;
  }
}

async function initCurrencies(): Promise<void> {
  try {
    const currencies = await loadCurrencies();
    let changed = false;

    if (!fillCurrencySelect(fromSelect, currencies, state.from)) {
      state.from = DEFAULT_FROM;
      selectCurrency(fromSelect, state.from);
      changed = true;
    }
    if (!fillCurrencySelect(toSelect, currencies, state.to)) {
      state.to = DEFAULT_TO;
      selectCurrency(toSelect, state.to);
      changed = true;
    }

    // В адресі була неіснуюча валюта — перераховуємо з валютою за замовчуванням
    if (changed) void updateConversion();
  } catch (error) {
    showError(
      converterStatus,
      `Не вдалося завантажити список валют. ${getErrorMessage(error)}`,
      () => void initCurrencies(),
    );
  }
}

function createSkeletonCard(): HTMLLIElement {
  return createElement('li', { className: 'rate-card', attrs: { 'aria-hidden': 'true' } }, [
    createElement('div', { className: 'rate-card__link' }, [
      createSkeleton('1.25rem', '40%'),
      createSkeleton('1rem', '70%'),
      createSkeleton('1.75rem', '60%'),
      createSkeleton('1rem', '50%'),
    ]),
  ]);
}

function getTrendClass(change: number): string {
  if (change > 0) return 'is-up';
  if (change < 0) return 'is-down';
  return '';
}

function createFailedCard(code: string): HTMLLIElement {
  return createElement('li', { className: 'rate-card' }, [
    createElement('div', { className: 'rate-card__link' }, [
      createElement('span', { className: 'rate-card__code', text: code }),
      createElement('span', { className: 'rate-card__name', text: 'Не вдалося завантажити курс' }),
    ]),
  ]);
}

function createRateCard(code: string, series: readonly Rate[]): HTMLLIElement {
  const sorted = [...series].sort((a, b) => a.date.localeCompare(b.date));
  const stats = calculateStats(sorted.map((item) => item.rate));
  const latest = sorted.at(-1);

  if (!stats || !latest) {
    return createFailedCard(code);
  }

  return createElement('li', { className: 'rate-card' }, [
    createElement(
      'a',
      { className: 'rate-card__link', attrs: { href: `./currency.html?code=${code}` } },
      [
        createElement('span', { className: 'rate-card__code', text: code }),
        createElement('span', { className: 'rate-card__name', text: getCurrencyName(code) }),
        createElement('span', {
          className: 'rate-card__value',
          text: `${formatNumber(latest.rate)} ₴`,
        }),
        createElement('span', {
          className: `rate-card__change ${getTrendClass(stats.change)}`,
          text: `${formatPercent(stats.change)} за тиждень`,
        }),
      ],
    ),
  ]);
}

async function loadPopularRates(): Promise<void> {
  popularList.setAttribute('aria-busy', 'true');
  popularList.replaceChildren(...POPULAR_CODES.map(() => createSkeletonCard()));

  const weekAgo = toIsoDate(subtractDays(new Date(), 7));

  // Чотири запити ПАРАЛЕЛЬНО. allSettled чекає на всі, навіть якщо деякі впали —
  // одна недоступна валюта не ламає решту карток
  const results = await Promise.allSettled(
    POPULAR_CODES.map((code) => getTimeSeries(code, DEFAULT_TO, weekAgo)),
  );

  const cards = POPULAR_CODES.map((code, index) => {
    const result = results[index];
    return result?.status === 'fulfilled'
      ? createRateCard(code, result.value)
      : createFailedCard(code);
  });

  popularList.replaceChildren(...cards);
  popularList.removeAttribute('aria-busy');
}

// =============== ІСТОРІЯ ===============

function createHistoryItem(entry: HistoryEntry): HTMLLIElement {
  const date = new Date(entry.timestamp);

  return createElement('li', { className: 'history__item' }, [
    createElement('span', {
      text: `${formatMoney(entry.amount, entry.from)} → ${formatMoney(entry.result, entry.to)}`,
    }),
    createElement('time', {
      className: 'history__time',
      text: formatTime(date),
      attrs: { datetime: date.toISOString() },
    }),
  ]);
}

function renderHistory(): void {
  const entries = getHistory();

  historyList.replaceChildren(...entries.map(createHistoryItem));
  historyEmpty.hidden = entries.length > 0;
  historyClear.hidden = entries.length === 0;
}

function bindHistoryEvents(): void {
  // tabindex="-1" дозволяє перемістити фокус на заголовок програмно
  historyTitle.tabIndex = -1;

  historyClear.addEventListener('click', () => {
    clearHistory();
    renderHistory();
    // Кнопка зникла — переносимо фокус, щоб користувач клавіатури не «загубився»
    historyTitle.focus();
  });
}

// =============== ЗАПУСК ===============

function init(): void {
  initTheme();
  readUrlState();
  selectCurrency(fromSelect, state.from);
  selectCurrency(toSelect, state.to);

  bindConverterEvents();
  bindHistoryEvents();
  renderHistory();

  void updateConversion();
  void initCurrencies();
  void loadPopularRates();
}

init();
