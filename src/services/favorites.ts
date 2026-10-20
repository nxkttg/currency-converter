/** Обрані валюти — зберігаються в localStorage */
import { readStorage, writeStorage } from '../utils/storage';

const STORAGE_KEY = 'valiutnyk:favorites';

const isStringArray = (value: unknown): value is string[] =>
  Array.isArray(value) && value.every((item) => typeof item === 'string');

/** Set — колекція унікальних значень зі швидкою перевіркою has() */
export function getFavorites(): Set<string> {
  return new Set(readStorage(STORAGE_KEY, isStringArray, []));
}

export function isFavorite(code: string): boolean {
  return getFavorites().has(code);
}

/** Додає або видаляє валюту. Повертає новий стан: true — тепер в обраному */
export function toggleFavorite(code: string): boolean {
  const favorites = getFavorites();
  const added = !favorites.has(code);

  if (added) {
    favorites.add(code);
  } else {
    favorites.delete(code);
  }

  writeStorage(STORAGE_KEY, [...favorites]);
  return added;
}
