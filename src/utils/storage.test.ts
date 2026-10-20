// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from 'vitest';
import { readStorage, writeStorage } from './storage';

const isStringArray = (value: unknown): value is string[] =>
  Array.isArray(value) && value.every((item) => typeof item === 'string');

const KEY = 'test-key';

describe('storage', () => {
  // Перед кожним тестом очищаємо сховище, щоб тести не впливали один на одного
  beforeEach(() => {
    localStorage.clear();
  });

  it('повертає fallback, якщо ключа немає', () => {
    expect(readStorage(KEY, isStringArray, [])).toEqual([]);
  });

  it('зберігає та читає значення', () => {
    expect(writeStorage(KEY, ['USD', 'EUR'])).toBe(true);
    expect(readStorage(KEY, isStringArray, [])).toEqual(['USD', 'EUR']);
  });

  it('повертає fallback для пошкодженого JSON', () => {
    localStorage.setItem(KEY, '{пошкоджено');
    expect(readStorage(KEY, isStringArray, [])).toEqual([]);
  });

  it('повертає fallback, якщо дані не пройшли перевірку типу', () => {
    localStorage.setItem(KEY, '[1, 2, 3]');
    expect(readStorage(KEY, isStringArray, [])).toEqual([]);
  });
});
