import { describe, expect, it } from 'vitest';
import { subtractDays, toIsoDate } from './date';

describe('toIsoDate', () => {
  it('форматує дату як YYYY-MM-DD', () => {
    expect(toIsoDate(new Date(Date.UTC(2026, 9, 18)))).toBe('2026-10-18');
  });
});

describe('subtractDays', () => {
  it('віднімає дні з переходом через місяць', () => {
    const result = subtractDays(new Date(Date.UTC(2026, 2, 1)), 1);
    expect(toIsoDate(result)).toBe('2026-02-28');
  });

  it('не змінює початкову дату', () => {
    const original = new Date(Date.UTC(2026, 9, 18));
    subtractDays(original, 7);
    expect(toIsoDate(original)).toBe('2026-10-18');
  });
});
