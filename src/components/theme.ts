/** Перемикач світлої/темної теми зі збереженням вибору */
import { readStorage, writeStorage } from '../utils/storage';

export type Theme = 'light' | 'dark';

const STORAGE_KEY = 'valiutnyk:theme';
const darkQuery = window.matchMedia('(prefers-color-scheme: dark)');

const isTheme = (value: unknown): value is Theme => value === 'light' || value === 'dark';
const isSavedTheme = (value: unknown): value is Theme | null => value === null || isTheme(value);

function getSystemTheme(): Theme {
  return darkQuery.matches ? 'dark' : 'light';
}

/** Поточна тема: обрана вручну або системна */
function getActiveTheme(): Theme {
  const current = document.documentElement.dataset.theme;
  return isTheme(current) ? current : getSystemTheme();
}

function updateToggle(toggle: HTMLButtonElement, theme: Theme): void {
  toggle.setAttribute('aria-pressed', String(theme === 'dark'));
}

export function initTheme(): void {
  const toggle = document.querySelector<HTMLButtonElement>('#theme-toggle');
  if (!toggle) return;

  const saved = readStorage(STORAGE_KEY, isSavedTheme, null);
  if (saved) {
    document.documentElement.dataset.theme = saved;
  }
  updateToggle(toggle, getActiveTheme());

  toggle.addEventListener('click', () => {
    const next: Theme = getActiveTheme() === 'dark' ? 'light' : 'dark';
    document.documentElement.dataset.theme = next;
    writeStorage(STORAGE_KEY, next);
    updateToggle(toggle, next);
  });

  // Якщо тему не обрано вручну — стежимо за зміною теми в системі
  darkQuery.addEventListener('change', () => {
    if (!document.documentElement.dataset.theme) {
      updateToggle(toggle, getSystemTheme());
    }
  });
}
