// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from 'vitest';
import {
  addHistoryEntry,
  clearHistory,
  getHistory,
  MAX_HISTORY,
  type HistoryEntry,
} from './history';

/** Partial<T> — усі поля необов'язкові: перевизначаємо лише потрібні */
const createEntry = (overrides: Partial<HistoryEntry> = {}): HistoryEntry => ({
  amount: 100,
  from: 'USD',
  to: 'UAH',
  result: 4487.8,
  rate: 44.878,
  timestamp: 1,
  ...overrides,
});

describe('history', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('спочатку історія порожня', () => {
    expect(getHistory()).toEqual([]);
  });

  it('додає новий запис на початок', () => {
    addHistoryEntry(createEntry({ from: 'USD' }));
    addHistoryEntry(createEntry({ from: 'EUR' }));

    expect(getHistory().map((entry) => entry.from)).toEqual(['EUR', 'USD']);
  });

  it('оновлює останній запис, якщо пара валют та сама', () => {
    addHistoryEntry(createEntry({ amount: 1 }));
    addHistoryEntry(createEntry({ amount: 100 }));

    const history = getHistory();
    expect(history).toHaveLength(1);
    expect(history[0]?.amount).toBe(100);
  });

  it(`зберігає не більше ${MAX_HISTORY} записів`, () => {
    for (let i = 0; i < MAX_HISTORY + 5; i++) {
      addHistoryEntry(createEntry({ from: `C${i}` }));
    }

    expect(getHistory()).toHaveLength(MAX_HISTORY);
  });

  it('clearHistory очищає історію', () => {
    addHistoryEntry(createEntry());
    clearHistory();

    expect(getHistory()).toEqual([]);
  });
});
