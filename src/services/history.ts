/** Історія конвертацій — останні записи в localStorage */
import { isRecord } from '../api/validators';
import { readStorage, writeStorage } from '../utils/storage';

export interface HistoryEntry {
  amount: number;
  from: string;
  to: string;
  result: number;
  rate: number;
  /** Час у мілісекундах (Date.now()) */
  timestamp: number;
}

export const MAX_HISTORY = 10;
const STORAGE_KEY = 'valiutnyk:history';

function isHistoryEntry(value: unknown): value is HistoryEntry {
  return (
    isRecord(value) &&
    typeof value.amount === 'number' &&
    typeof value.from === 'string' &&
    typeof value.to === 'string' &&
    typeof value.result === 'number' &&
    typeof value.rate === 'number' &&
    typeof value.timestamp === 'number'
  );
}

const isHistory = (value: unknown): value is HistoryEntry[] =>
  Array.isArray(value) && value.every(isHistoryEntry);

export function getHistory(): HistoryEntry[] {
  return readStorage(STORAGE_KEY, isHistory, []);
}

/**
 * Додає запис на початок історії.
 * Якщо остання конвертація була для тієї ж пари валют (користувач лише змінив суму) —
 * оновлюємо її замість додавання нової, щоб історія не засмічувалась при наборі тексту.
 */
export function addHistoryEntry(entry: HistoryEntry): HistoryEntry[] {
  const history = getHistory();
  const latest = history[0];
  const isSamePair = latest !== undefined && latest.from === entry.from && latest.to === entry.to;

  const updated = [entry, ...(isSamePair ? history.slice(1) : history)].slice(0, MAX_HISTORY);
  writeStorage(STORAGE_KEY, updated);
  return updated;
}

export function clearHistory(): void {
  writeStorage(STORAGE_KEY, []);
}
